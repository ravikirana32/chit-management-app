import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class FixedDrawService {
  constructor(private readonly sequelize:Sequelize){}

  async startDraw(chitId:string, monthId:string, actorUserId:string){
    return this.sequelize.transaction(async transaction=>{
      const [months]:any=await this.sequelize.query(`SELECT m.*,c.creator_id,c.status AS chit_status FROM chit_months m JOIN chits c ON c.id=m.chit_id WHERE m.id=:monthId AND m.chit_id=:chitId FOR UPDATE`,{replacements:{monthId,chitId},transaction});
      if(!months.length) throw new NotFoundException('Chit month not found');
      const m=months[0];
      if(m.creator_id!==actorUserId) throw new ConflictException('Only creator can start the draw');
      if(!['READY_TO_START','ACTIVE','RUNNING'].includes(m.chit_status)) throw new ConflictException('Chit is not ready for draw');
      if(m.month_type!=='ACTION') throw new BadRequestException('Agent Chit month cannot run a draw');
      if(!['SCHEDULED','READY_FOR_ACTION','COLLECTION'].includes(m.status)) throw new ConflictException('Month is not available for draw');
      const [existing]:any=await this.sequelize.query(`SELECT id,status FROM draws WHERE chit_month_id=:monthId FOR UPDATE`,{replacements:{monthId},transaction});
      if(existing.length) throw new ConflictException('A draw already exists for this month');

      const [eligible]:any=await this.sequelize.query(`
        SELECT cp.id,cp.user_id,cp.participant_sequence
        FROM chit_participants cp
        WHERE cp.chit_id=:chitId AND cp.status='ACTIVE'
          AND NOT EXISTS (SELECT 1 FROM draw_winners dw JOIN draws d ON d.id=dw.draw_id WHERE dw.chit_participant_id=cp.id AND d.chit_id=:chitId)
          AND NOT EXISTS (SELECT 1 FROM auction_winners aw JOIN auctions a ON a.id=aw.auction_id WHERE aw.chit_participant_id=cp.id AND a.chit_id=:chitId)
          AND NOT EXISTS (SELECT 1 FROM contribution_obligations o JOIN chit_months om ON om.id=o.chit_month_id WHERE o.chit_participant_id=cp.id AND om.chit_id=:chitId AND o.status IN ('OVERDUE','DEFAULTED','DISPUTED'))
        ORDER BY cp.participant_sequence FOR UPDATE`,{replacements:{chitId},transaction});
      if(!eligible.length) throw new BadRequestException('No eligible participants remain');

      const [draws]:any=await this.sequelize.query(`INSERT INTO draws (id,chit_id,chit_month_id,status,selection_method,scheduled_at,started_at,executed_by,rules_snapshot,idempotency_key,created_at,updated_at) VALUES(gen_random_uuid(),:chitId,:monthId,'IN_PROGRESS','RANDOM',NOW(),NOW(),:actor,:rules,CONCAT('draw:',:monthId),NOW(),NOW()) RETURNING *`,{replacements:{chitId,monthId,actor:actorUserId,rules:JSON.stringify({winnerCount:1,previousWinnerExcluded:true,defaultExcluded:true})},transaction});
      const draw=draws[0];
      for(const p of eligible){ await this.sequelize.query(`INSERT INTO draw_participants (id,draw_id,chit_participant_id,eligibility_status,participant_sequence,created_at,updated_at) VALUES(gen_random_uuid(),:drawId,:pid,'ELIGIBLE',:seq,NOW(),NOW())`,{replacements:{drawId:draw.id,pid:p.id,seq:p.participant_sequence},transaction}); }
      const [winnerRows]:any=await this.sequelize.query(`SELECT chit_participant_id FROM draw_participants WHERE draw_id=:drawId AND eligibility_status='ELIGIBLE' ORDER BY random() LIMIT 1`,{replacements:{drawId:draw.id},transaction});
      const winnerId=winnerRows[0].chit_participant_id;
      const [winner]:any=await this.sequelize.query(`INSERT INTO draw_winners (id,draw_id,chit_participant_id,selected_at,selection_method,result_reference,created_at,updated_at) VALUES(gen_random_uuid(),:drawId,:pid,NOW(),'RANDOM',:ref,NOW(),NOW()) RETURNING *`,{replacements:{drawId:draw.id,pid:winnerId,ref:'DRAW-'+draw.id},transaction});
      const [payout]:any=await this.sequelize.query(`INSERT INTO payouts (id,chit_id,chit_month_id,recipient_user_id,amount,payment_method,status,recorded_by,notes,created_at,updated_at) SELECT gen_random_uuid(),:chitId,:monthId,cp.user_id,m.scheduled_amount,'UPI','PENDING',:actor,'Fixed Draw winner payout',NOW(),NOW() FROM chit_participants cp JOIN chit_months m ON m.id=:monthId WHERE cp.id=:pid RETURNING *`,{replacements:{chitId,monthId,actor:actorUserId,pid:winnerId},transaction});
      await this.sequelize.query(`UPDATE draws SET status='COMPLETED',completed_at=NOW(),updated_at=NOW() WHERE id=:drawId`,{replacements:{drawId:draw.id},transaction});
      await this.sequelize.query(`UPDATE chit_months SET status='COMPLETED',updated_at=NOW() WHERE id=:monthId`,{replacements:{monthId},transaction});
      await this.sequelize.query(`INSERT INTO audit_logs (id,actor_user_id,chit_id,action,entity_type,entity_id,after_data,created_at,updated_at) VALUES(gen_random_uuid(),:actor,:chitId,'FIXED_DRAW_COMPLETED','DRAW',:drawId,:data,NOW(),NOW())`,{replacements:{actor:actorUserId,chitId,drawId:draw.id,data:JSON.stringify({winnerParticipantId:winnerId,eligibleCount:eligible.length,payoutAmount:m.scheduled_amount})},transaction});
      return {draw,winner:winner[0],payout:payout[0],eligibleCount:eligible.length,configuration:'Winner remains an active participant and continues all future contribution obligations.'};
    });
  }
}
