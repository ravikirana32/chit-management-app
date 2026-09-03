import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { AuctionGateway } from './auction.gateway';
import { OperationSchedulePolicyService } from '../../common/enterprise-hardening/operation-schedule-policy.service';

@Injectable()
export class AuctionService {
  constructor(private readonly sequelize: Sequelize, private readonly gateway: AuctionGateway, private readonly schedulePolicy: OperationSchedulePolicyService) {}

  private async canRunAuction(chitId: string, userId: string, transaction?: any) {
    const [creator]: any = await this.sequelize.query(
      `SELECT 1 FROM chits WHERE id=:chitId AND creator_id=:userId LIMIT 1`,
      { replacements: { chitId, userId }, transaction },
    );
    if (creator.length) return true;
    const [admin]: any = await this.sequelize.query(
      `SELECT 1 FROM user_roles WHERE user_id=:userId AND role='ADMIN' LIMIT 1`,
      { replacements: { userId }, transaction },
    );
    if (admin.length) return true;
    const [agent]: any = await this.sequelize.query(
      `SELECT 1
       FROM chit_agent_assignments ca
       JOIN agents ag ON ag.id=ca.agent_id
       WHERE ca.chit_id=:chitId
         AND ag.user_id=:userId
         AND ca.active=true
         AND ca.can_run_auction=true
         AND ag.status='ACTIVE'
       LIMIT 1`,
      { replacements: { chitId, userId }, transaction },
    );
    return !!agent.length;
  }

  private async assertCanRunAuction(chitId: string, userId: string, transaction?: any) {
    if (!(await this.canRunAuction(chitId, userId, transaction))) {
      throw new ConflictException('Auction permission is required for this chit');
    }
  }

  private async localDateMatches(sequelize: Sequelize, chitId: string, scheduledDate: string, transaction?: any) {
    const [r]: any = await sequelize.query(
      `SELECT ((NOW() AT TIME ZONE COALESCE(timezone,'Asia/Kolkata'))::date)::text AS today
       FROM chits WHERE id=:chitId`,
      { replacements: { chitId }, transaction },
    );
    return !!r.length && String(r[0].today) === String(scheduledDate).slice(0,10);
  }

  async open(chitId: string, monthId: string, actorUserId: string, durationMinutes: number) {
    if (durationMinutes < 1 || durationMinutes > 60) throw new BadRequestException('Auction duration must be between 1 and 60 minutes');

    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT m.*, c.creator_id, c.chit_type, c.status AS chit_status, c.timezone, c.total_chit_amount
         FROM chit_months m JOIN chits c ON c.id=m.chit_id
         WHERE m.id=:monthId AND m.chit_id=:chitId FOR UPDATE`,
        { replacements: { monthId, chitId }, transaction },
      );
      if (!rows.length) throw new NotFoundException('Chit month not found');
      const month = rows[0];
      await this.assertCanRunAuction(chitId, actorUserId, transaction);
      if (month.chit_type !== 'AUCTION') throw new BadRequestException('This chit is not configured as an auction chit');
      if (month.month_type === 'AGENT_CHIT') throw new BadRequestException('Agent Chit months cannot be auctioned');
      if (!['READY_TO_START', 'ACTIVE'].includes(month.chit_status)) throw new ConflictException('Chit is not ready for auction');
      if (!['SCHEDULED', 'READY_FOR_ACTION', 'COLLECTION'].includes(month.status)) throw new ConflictException('This month is not available for auction');
      const dateAllowed=await this.localDateMatches(this.sequelize,chitId,month.scheduled_date,transaction);
      this.schedulePolicy.assertScheduleAllowed(dateAllowed,`Auction can only be opened on scheduled date ${month.scheduled_date}`);

      const [existing]: any = await this.sequelize.query(
        `SELECT id,status FROM auctions WHERE chit_month_id=:monthId FOR UPDATE`,
        { replacements: { monthId }, transaction },
      );
      if (existing.some((x: any) => ['OPEN','FINALIZING','COMPLETED'].includes(x.status))) {
        throw new ConflictException('Auction already exists for this month');
      }
      if (existing.some((x: any) => x.status === 'CLOSED_PENDING_FINALIZATION')) {
        throw new ConflictException('Auction was closed early; use the reopen endpoint');
      }

      const [auctionRows]: any = await this.sequelize.query(
        `INSERT INTO auctions
          (id,chit_id,chit_month_id,status,auction_type,funding_amount,starts_at,ends_at,created_by,rules_snapshot,created_at,updated_at)
         VALUES
          (gen_random_uuid(),:chitId,:monthId,'OPEN','MONTHLY',:funding,NOW(),NOW()+(:duration || ' minutes')::interval,
           :actor,:rules,NOW(),NOW()) RETURNING *`,
        { replacements: {
          chitId, monthId, funding: month.scheduled_amount, duration: durationMinutes, actor: actorUserId,
          rules: JSON.stringify({ windowMinutes: durationMinutes, maximumWindowMinutes: 60, winner: 'highest-valid-discount', tieBreaker: 'earliest-valid-bid' }),
        }, transaction },
      );
      await this.sequelize.query(
        `UPDATE chit_months SET status='BIDDING',updated_at=NOW() WHERE id=:monthId`,
        { replacements: { monthId }, transaction },
      );
      return auctionRows[0];
    });
  }

  async close(auctionId: string, actorUserId: string) {
    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT a.*,m.scheduled_date,m.chit_id,c.timezone
         FROM auctions a LEFT JOIN chit_months m ON m.id=a.chit_month_id
         JOIN chits c ON c.id=a.chit_id WHERE a.id=:auctionId FOR UPDATE`,
        { replacements: { auctionId }, transaction },
      );
      if (!rows.length) throw new NotFoundException('Auction not found');
      const a = rows[0];
      await this.assertCanRunAuction(a.chit_id, actorUserId, transaction);
      if (a.status === 'CLOSED_PENDING_FINALIZATION') return { success: true, data: a, message: 'Auction already closed' };
      if (a.status !== 'OPEN') throw new ConflictException('Only an open auction can be closed');
      if (new Date(a.ends_at).getTime() <= Date.now()) throw new ConflictException('Auction time has already expired; it will be auto-closed');
      const localDate = a.scheduled_date || new Date(a.starts_at).toISOString().slice(0,10);
      const dateAllowed=await this.localDateMatches(this.sequelize,a.chit_id,localDate,transaction);
      this.schedulePolicy.assertScheduleAllowed(dateAllowed,'Auction can only be manually closed on its auction date');
      const [updated]: any = await this.sequelize.query(
        `UPDATE auctions SET status='CLOSED_PENDING_FINALIZATION',updated_at=NOW() WHERE id=:auctionId RETURNING *`,
        { replacements: { auctionId }, transaction },
      );
      if (a.chit_month_id) await this.sequelize.query(
        `UPDATE chit_months SET status='READY_FOR_ACTION',updated_at=NOW() WHERE id=:monthId AND status='BIDDING'`,
        { replacements: { monthId: a.chit_month_id }, transaction },
      );
      await this.audit(auctionId, a.chit_id, actorUserId, 'AUCTION_CLOSED_EARLY', { reason:'AGENT_OR_CREATOR_CLOSED' }, transaction);
      this.gateway.emitClosed(auctionId, { auctionId, reason:'MANUAL_CLOSE', status:'CLOSED_PENDING_FINALIZATION' });
      return { success: true, data: updated[0] };
    });
  }

  async reopen(auctionId: string, actorUserId: string, durationMinutes?: number) {
    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT a.*,m.scheduled_date,m.chit_id AS month_chit_id,c.timezone
         FROM auctions a LEFT JOIN chit_months m ON m.id=a.chit_month_id
         JOIN chits c ON c.id=a.chit_id WHERE a.id=:auctionId FOR UPDATE`,
        { replacements: { auctionId }, transaction },
      );
      if (!rows.length) throw new NotFoundException('Auction not found');
      const a = rows[0];
      await this.assertCanRunAuction(a.chit_id, actorUserId, transaction);
      if (a.status === 'COMPLETED') throw new ConflictException('A finalized auction cannot be reopened');
      if (a.status !== 'CLOSED_PENDING_FINALIZATION') throw new ConflictException('Only an early-closed auction can be reopened');
      const date = a.scheduled_date || new Date(a.starts_at).toISOString().slice(0,10);
      const dateAllowed=await this.localDateMatches(this.sequelize,a.chit_id,date,transaction); this.schedulePolicy.assertScheduleAllowed(dateAllowed,'Auction can only be reopened on its auction date');
      const remainingSeconds = Math.floor((new Date(a.ends_at).getTime() - Date.now()) / 1000);
      if (remainingSeconds <= 0) throw new ConflictException('The original auction window has expired and cannot be reopened');
      const requested = durationMinutes ?? Math.max(1, Math.ceil(remainingSeconds / 60));
      if (requested < 1 || requested > 60) throw new BadRequestException('Auction duration must be between 1 and 60 minutes');
      const requestedSeconds = Math.min(requested * 60, remainingSeconds);
      const [updated]: any = await this.sequelize.query(
        `UPDATE auctions SET status='OPEN',starts_at=NOW(),ends_at=NOW()+(:seconds || ' seconds')::interval,
         updated_at=NOW(),rules_snapshot=COALESCE(rules_snapshot,'{}'::jsonb) || :rules::jsonb
         WHERE id=:auctionId RETURNING *`,
        { replacements: { auctionId, seconds: requestedSeconds, rules: JSON.stringify({ reopenedAt:new Date().toISOString(), reopenedBy:actorUserId }) }, transaction },
      );
      if (a.chit_month_id) await this.sequelize.query(
        `UPDATE chit_months SET status='BIDDING',updated_at=NOW() WHERE id=:monthId`,
        { replacements: { monthId:a.chit_month_id }, transaction },
      );
      await this.audit(auctionId,a.chit_id,actorUserId,'AUCTION_REOPENED',{durationSeconds:requestedSeconds},transaction);
      return { success:true, data:updated[0] };
    });
  }

  async openAdditional(chitId:string, actorUserId:string, durationMinutes:number) {
    if (durationMinutes < 1 || durationMinutes > 60) throw new BadRequestException('Auction duration must be between 1 and 60 minutes');
    return this.sequelize.transaction(async transaction => {
      const [chits]:any = await this.sequelize.query(
        `SELECT * FROM chits WHERE id=:chitId FOR UPDATE`, { replacements:{chitId}, transaction });
      if(!chits.length) throw new NotFoundException('Chit not found');
      const chit=chits[0];
      await this.assertCanRunAuction(chitId,actorUserId,transaction);
      if(chit.chit_type!=='AUCTION') throw new BadRequestException('Additional auction is only available for auction chits');
      if(['COMPLETED','ARCHIVED','CANCELLED'].includes(chit.status)) throw new ConflictException('Chit is not active');
      const savings=Number(chit.accumulated_savings_amount||0), face=Number(chit.total_chit_amount||0);
      if(!Number.isFinite(face)||face<=0) throw new ConflictException('Chit total amount is not configured');
      if(savings < face) throw new ConflictException(`Additional auction requires savings of at least ₹${face.toFixed(2)}; current savings ₹${savings.toFixed(2)}`);
      const [open]:any=await this.sequelize.query(`SELECT id FROM auctions WHERE chit_id=:chitId AND status IN ('OPEN','FINALIZING') LIMIT 1`,{replacements:{chitId},transaction});
      if(open.length) throw new ConflictException('Another auction is currently open');
      const [r]:any=await this.sequelize.query(
        `INSERT INTO auctions(id,chit_id,chit_month_id,status,auction_type,funding_amount,starts_at,ends_at,created_by,rules_snapshot,created_at,updated_at)
         VALUES(gen_random_uuid(),:chitId,NULL,'OPEN','ADDITIONAL',:face,NOW(),NOW()+(:duration || ' minutes')::interval,:actor,:rules,NOW(),NOW()) RETURNING *`,
        {replacements:{chitId,face,duration:durationMinutes,actor:actorUserId,rules:JSON.stringify({windowMinutes:durationMinutes,maximumWindowMinutes:60,winner:'highest-valid-discount',fundedBy:'CHIT_SAVINGS'})},transaction});
      return {success:true,data:r[0],savingsBefore:savings,additionalAuctionAmount:face};
    });
  }

  async current(chitId: string, monthId: string, userId: string) {
    const [access]:any=await this.sequelize.query(`SELECT 1 FROM chits c LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:user WHERE c.id=:chitId AND (c.creator_id=:user OR ag.user_id=:user OR EXISTS (SELECT 1 FROM chit_participants cp WHERE cp.chit_id=c.id AND cp.user_id=:user AND cp.status='ACTIVE') OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:user AND ur.role='ADMIN')) LIMIT 1`,{replacements:{chitId,user:userId}});
    if(!access.length)throw new ConflictException('Auction access is required for this chit');
    const [rows]: any = await this.sequelize.query(
      `SELECT a.id,a.status,a.auction_type,a.starts_at,a.ends_at,a.funding_amount,
              a.winning_bid_amount,a.discount_amount,a.payout_amount,
              a.chit_month_id
       FROM auctions a
       WHERE a.chit_id=:chitId AND a.chit_month_id=:monthId
       ORDER BY a.created_at DESC
       LIMIT 1`,
      { replacements: { chitId, monthId } },
    );
    return { success:true, data: rows[0] ?? null };
  }

  async getSavings(chitId:string,userId:string){
    await this.assertCanRunAuction(chitId,userId);
    const [chits]:any=await this.sequelize.query(`SELECT id,total_chit_amount,accumulated_savings_amount,total_members,total_months FROM chits WHERE id=:chitId`,{replacements:{chitId}});
    if(!chits.length)throw new NotFoundException('Chit not found');
    const [tx]:any=await this.sequelize.query(`SELECT * FROM chit_savings_transactions WHERE chit_id=:chitId ORDER BY created_at ASC,id ASC`,{replacements:{chitId}});
    const c=chits[0];
    return {success:true,data:{chitId,totalChitAmount:c.total_chit_amount,accumulatedSavingsAmount:c.accumulated_savings_amount,additionalAuctionEligible:Number(c.accumulated_savings_amount)>=Number(c.total_chit_amount),remainingMonths:Math.max(0,Number(c.total_months)-Number(c.completed_months||0)),transactions:tx}};
  }

  async placeBid(auctionId:string,participantId:string,userId:string,bidAmount:string){
    return this.sequelize.transaction(async transaction=>{
      const [auctions]:any=await this.sequelize.query(
        `SELECT a.*,COALESCE(a.funding_amount,m.scheduled_amount) AS auction_amount,m.status AS month_status
         FROM auctions a LEFT JOIN chit_months m ON m.id=a.chit_month_id
         WHERE a.id=:auctionId FOR UPDATE`,{replacements:{auctionId},transaction});
      if(!auctions.length)throw new NotFoundException('Auction not found'); const auction=auctions[0];
      if(auction.status!=='OPEN')throw new ConflictException('Auction is not open');
      if(new Date(auction.ends_at).getTime()<=Date.now())throw new ConflictException('Auction bidding window has closed');
      const [participants]:any=await this.sequelize.query(`SELECT cp.* FROM chit_participants cp WHERE cp.id=:participantId AND cp.chit_id=:chitId FOR UPDATE`,{replacements:{participantId,chitId:auction.chit_id},transaction});
      if(!participants.length)throw new NotFoundException('Participant not found'); const p=participants[0];
      if(p.user_id!==userId)throw new ConflictException('Authenticated user does not own this participant');
      if(p.status!=='ACTIVE')throw new ConflictException('Participant is not active');
      const [wins]:any=await this.sequelize.query(`SELECT 1 FROM draw_winners dw JOIN draws d ON d.id=dw.draw_id WHERE dw.chit_participant_id=:participantId AND d.chit_id=:chitId UNION ALL SELECT 1 FROM auction_winners aw JOIN auctions pa ON pa.id=aw.auction_id WHERE aw.chit_participant_id=:participantId AND pa.chit_id=:chitId LIMIT 1`,{replacements:{participantId,chitId:auction.chit_id},transaction});
      if(wins.length)throw new ConflictException('Participant has already won a previous chit month');
      const bid=Number(bidAmount),pot=Number(auction.auction_amount);
      if(!Number.isFinite(bid)||bid<=0||bid>=pot)throw new BadRequestException('Bid must be greater than zero and less than the auction amount');
      const [bids]:any=await this.sequelize.query(`INSERT INTO bids(id,auction_id,chit_participant_id,amount,sequence_number,status,submitted_at,accepted_at,client_reference,server_reference,created_at,updated_at) VALUES(gen_random_uuid(),:auctionId,:participantId,:bid,COALESCE((SELECT MAX(sequence_number) FROM bids WHERE auction_id=:auctionId),0)+1,'VALID',NOW(),NOW(),NULL,CONCAT('BID-',gen_random_uuid()),NOW(),NOW()) RETURNING *`,{replacements:{auctionId,participantId,bid},transaction});
      this.gateway.emitBid(auctionId,{auctionId,participantId,bidAmount:bid,bidAt:bids[0].submitted_at}); return bids[0];
    });
  }

  async finalize(auctionId:string,actorUserId:string){
    return this.sequelize.transaction(async transaction=>{
      const [rows]:any=await this.sequelize.query(`SELECT a.*,COALESCE(a.funding_amount,m.scheduled_amount) AS auction_amount,m.scheduled_amount,m.chit_id AS month_chit_id,c.creator_id,c.total_chit_amount,c.accumulated_savings_amount,c.total_months,c.completed_months FROM auctions a LEFT JOIN chit_months m ON m.id=a.chit_month_id JOIN chits c ON c.id=a.chit_id WHERE a.id=:auctionId FOR UPDATE`,{replacements:{auctionId},transaction});
      if(!rows.length)throw new NotFoundException('Auction not found'); const a=rows[0]; await this.assertCanRunAuction(a.chit_id,actorUserId,transaction);
      if(a.status==='COMPLETED')throw new ConflictException('Auction is already finalized');
      if(!['OPEN','CLOSED_PENDING_FINALIZATION'].includes(a.status))throw new ConflictException('Auction is not ready for finalization');
      if(a.status==='OPEN'&&new Date(a.ends_at).getTime()>Date.now())throw new ConflictException('Bidding window is still open');
      await this.sequelize.query(`UPDATE auctions SET status='FINALIZING',finalized_at=NOW(),updated_at=NOW() WHERE id=:auctionId`,{replacements:{auctionId},transaction});
      const [bids]:any=await this.sequelize.query(`SELECT b.*,cp.user_id FROM bids b JOIN chit_participants cp ON cp.id=b.chit_participant_id WHERE b.auction_id=:auctionId AND b.status='VALID' ORDER BY b.amount DESC,b.submitted_at ASC FOR UPDATE`,{replacements:{auctionId},transaction});
      if(!bids.length)throw new BadRequestException('No valid bids were received');
      const winner=bids[0], pot=Number(a.auction_amount), discount=Number(winner.amount), payoutAmount=pot-discount;
      if(payoutAmount<0)throw new BadRequestException('Calculated payout cannot be negative');
      const isAdditional=a.auction_type==='ADDITIONAL';
      const savingsBefore=Number(a.accumulated_savings_amount||0);
      // Do not mutate chit savings at auction finalization. The payout is still
      // PENDING and the real collection/settlement may happen later by CASH or UPI.
      // Savings become authoritative only when the payout is SETTLED.
      if(isAdditional){
        const face=Number(a.total_chit_amount);
        if(savingsBefore<face)throw new ConflictException('Savings are below the chit total amount');
      }
      const savingsAfter=savingsBefore;
      const [winnerRows]:any=await this.sequelize.query(`INSERT INTO auction_winners(id,auction_id,chit_participant_id,winning_bid_id,winning_bid_amount,selected_at,created_at,updated_at) VALUES(gen_random_uuid(),:auctionId,:pid,:bidId,:amount,NOW(),NOW(),NOW()) RETURNING *`,{replacements:{auctionId,pid:winner.chit_participant_id,bidId:winner.id,amount:discount},transaction});
      const [payoutRows]:any=await this.sequelize.query(`INSERT INTO payouts(id,chit_id,chit_month_id,recipient_user_id,amount,payment_method,status,recorded_by,notes,created_at,updated_at) VALUES(gen_random_uuid(),:chitId,:monthId,:userId,:amount,'UPI','PENDING',:actor,:notes,NOW(),NOW()) RETURNING *`,{replacements:{chitId:a.chit_id,monthId:a.chit_month_id??null,userId:winner.user_id,amount:payoutAmount,actor:actorUserId,notes:isAdditional?'Additional auction payout from chit savings':`Auction discount: ₹${discount.toFixed(2)}`},transaction});
      await this.sequelize.query(`UPDATE bids SET status=CASE WHEN id=:winnerId THEN 'WINNING' ELSE 'NON_WINNING' END,updated_at=NOW() WHERE auction_id=:auctionId AND status='VALID'`,{replacements:{winnerId:winner.id,auctionId},transaction});
      await this.sequelize.query(`UPDATE auctions SET status='COMPLETED',winner_participant_id=:pid,winning_bid_amount=:amount,discount_amount=:discount,payout_amount=:payout,completed_at=NOW(),updated_at=NOW() WHERE id=:auctionId`,{replacements:{auctionId,pid:winner.chit_participant_id,amount:discount,discount,payout:payoutAmount},transaction});
      if(a.chit_month_id){
        await this.sequelize.query(`UPDATE chit_months SET status='COMPLETED',updated_at=NOW() WHERE id=:monthId`,{replacements:{monthId:a.chit_month_id},transaction});
      }
      // Financial savings transaction is deliberately deferred to payout settlement.
      // This keeps collections, payout and savings atomic even when members pay later.
      await this.audit(auctionId,a.chit_id,actorUserId,'AUCTION_COMPLETED',{winnerParticipantId:winner.chit_participant_id,winningBid:discount,scheduledAmount:pot,payoutAmount,bidCount:bids.length,isAdditional,savingsBefore,savingsAfter},transaction);
      this.gateway.emitClosed(auctionId,{auctionId,winnerParticipantId:winner.chit_participant_id,winningBid:discount,payoutAmount,savingsAfter});
      return {auctionId,winnerParticipantId:winner.chit_participant_id,winningBid:discount,scheduledAmount:pot,payoutAmount,bidCount:bids.length,isAdditional,savingsBefore,savingsAfter,remainingMonths:Math.max(0,Number(a.total_months)-Number(a.completed_months||0)-1),rule:'Winner remains active and continues future contributions.',winner:winnerRows[0],payout:payoutRows[0]};
    });
  }

  private async audit(auctionId:string,chitId:string,actor:string,action:dataKey, data:any,transaction:any){
    await this.sequelize.query(`INSERT INTO audit_logs(id,actor_user_id,chit_id,action,entity_type,entity_id,after_data,created_at,updated_at) VALUES(gen_random_uuid(),:actor,:chitId,:action,'AUCTION',:auctionId,:data,NOW(),NOW())`,{replacements:{actor,chitId,action,auctionId,data:JSON.stringify(data)},transaction});
  }
}
type dataKey = string;
