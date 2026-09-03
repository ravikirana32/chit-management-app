import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuctionStateService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly config: ConfigService,
  ) {}

  async getState(auctionId: string, userId: string) {
    const [rows]: any = await this.sequelize.query(`SELECT a.id,a.chit_id,a.status,a.auction_type,a.starts_at,a.ends_at,a.funding_amount,a.winning_bid_amount,a.discount_amount,a.payout_amount,a.reveal_status,a.reveal_started_at,a.reveal_ends_at,a.winner_revealed_at,a.reveal_duration_seconds,m.id AS month_id,m.month_number,m.scheduled_amount,m.scheduled_date,c.total_chit_amount,c.accumulated_savings_amount,c.completed_months,c.total_months FROM auctions a LEFT JOIN chit_months m ON m.id=a.chit_month_id JOIN chits c ON c.id=a.chit_id WHERE a.id=:auctionId`,{replacements:{auctionId}});
    if(!rows.length)throw new NotFoundException('Auction not found');
    const a=rows[0];
    const [access]:any=await this.sequelize.query(`SELECT 1 FROM chits c WHERE c.id=:chitId AND (c.creator_id=:userId OR EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN') OR EXISTS(SELECT 1 FROM chit_participants cp WHERE cp.chit_id=c.id AND cp.user_id=:userId AND cp.status='ACTIVE') OR EXISTS(SELECT 1 FROM chit_agent_assignments ca JOIN agents ag ON ag.id=ca.agent_id WHERE ca.chit_id=c.id AND ca.active=true AND ag.user_id=:userId AND ag.status='ACTIVE')) LIMIT 1`,{replacements:{chitId:a.chit_id,userId}});
    if(!access.length)throw new ConflictException('Auction access is required');
    const [bids]:any=await this.sequelize.query(`SELECT b.id,b.chit_participant_id,b.amount AS bid_amount,b.submitted_at AS bid_at,cp.participant_sequence,u.name AS member_name,u.mobile_number AS member_mobile FROM bids b JOIN chit_participants cp ON cp.id=b.chit_participant_id JOIN users u ON u.id=cp.user_id WHERE b.auction_id=:auctionId AND b.status IN ('VALID','WINNING','NON_WINNING') ORDER BY b.amount DESC,b.submitted_at ASC LIMIT 50`,{replacements:{auctionId}});
    const closeMs=new Date(a.ends_at).getTime();
    const [winnerRows]: any = await this.sequelize.query(`SELECT aw.*,cp.participant_sequence,u.name AS member_name,u.mobile_number AS member_mobile FROM auction_winners aw JOIN chit_participants cp ON cp.id=aw.chit_participant_id JOIN users u ON u.id=cp.user_id WHERE aw.auction_id=:auctionId LIMIT 1`,{replacements:{auctionId}});
    const winner=winnerRows[0]??null;
    const revealStatus=String(a.reveal_status||'NONE').toUpperCase();
    const revealEndsAt=a.reveal_ends_at??null;
    const winnerVisible=revealStatus==='REVEALED';
    const bypass=this.config.get<string>('ALLOW_SCHEDULED_OPERATION_BYPASS','false').trim().toLowerCase()==='true';
    const now=Date.now();
    const scheduledDate=a.scheduled_date?String(a.scheduled_date).slice(0,10):null;
    const localToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const dateReady=bypass||!scheduledDate||scheduledDate===localToday;
    const status=String(a.status||'').toUpperCase();
    const allowedActions={
      open:false,bid:status==='OPEN',close:status==='OPEN'&&(bypass||now<closeMs),reopen:status==='CLOSED_PENDING_FINALIZATION'&&bypass,finalize:status==='CLOSED_PENDING_FINALIZATION'||(status==='OPEN'&&now>=closeMs),additionalOpen:false
    };
    return {auctionId,status:a.status,auctionType:a.auction_type,opensAt:a.starts_at,closesAt:a.ends_at,remainingSeconds:Math.max(0,Math.floor((closeMs-now)/1000)),month:a.month_id?{id:a.month_id,number:a.month_number,scheduledAmount:a.scheduled_amount,scheduledDate:a.scheduled_date}:null,auctionAmount:a.funding_amount??a.scheduled_amount,winningBid:winnerVisible?a.winning_bid_amount:null,discount:winnerVisible?a.discount_amount:null,payoutAmount:winnerVisible?a.payout_amount:null,savings:{totalChitAmount:a.total_chit_amount,accumulatedSavingsAmount:a.accumulated_savings_amount,additionalAuctionEligible:Number(a.accumulated_savings_amount||0)>=Number(a.total_chit_amount||0)},winner:winnerVisible&&winner?{id:winner.id,chit_participant_id:winner.chit_participant_id,participant_sequence:Number(winner.participant_sequence),member_name:winner.member_name,member_mobile:winner.member_mobile}:null,revealStatus,revealStartedAt:a.reveal_started_at,revealEndsAt,revealDurationSeconds:a.reveal_duration_seconds,winnerRevealedAt:a.winner_revealed_at,bids:bids.map((b:any)=>({...b,participant_sequence:Number(b.participant_sequence)})),scheduleBypassEnabled:bypass,scheduledDate,dateReady,allowedActions};
  }
}
