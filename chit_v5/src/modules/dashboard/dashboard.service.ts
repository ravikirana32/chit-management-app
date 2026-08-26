import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class DashboardService {
  constructor(private readonly sequelize: Sequelize) {}

  async member(userId:string) {
    const [chits]:any=await this.sequelize.query(
      `SELECT c.id,c.name,c.chit_type,c.status,c.total_members,
              cp.id AS participant_id,cp.participant_sequence,cp.status AS participant_status
       FROM chit_participants cp
       JOIN chits c ON c.id=cp.chit_id
       WHERE cp.user_id=:userId
       ORDER BY c.created_at DESC`,
      {replacements:{userId}});
    const result=[];
    for(const chit of chits){
      const [summary]:any=await this.sequelize.query(
        `SELECT
          COALESCE(SUM(o.due_amount),0) AS total_due,
          COALESCE(SUM(o.paid_amount),0) AS total_paid,
          COALESCE(SUM(o.outstanding_amount),0) AS outstanding,
          COUNT(*) FILTER (WHERE o.status='VERIFIED') AS paid_months,
          COUNT(*) FILTER (WHERE o.status IN ('OVERDUE','DEFAULTED')) AS exception_months
         FROM contribution_obligations o
         WHERE o.chit_participant_id=:participantId`,
        {replacements:{participantId:chit.participant_id}});
      const [wins]:any=await this.sequelize.query(
        `SELECT COUNT(*) AS wins FROM (
          SELECT dw.id FROM draw_winners dw JOIN draws d ON d.id=dw.draw_id WHERE dw.chit_participant_id=:participantId
          UNION ALL
          SELECT aw.id FROM auction_winners aw WHERE aw.chit_participant_id=:participantId
        ) x`,
        {replacements:{participantId:chit.participant_id}});
      result.push({...chit,financial:summary[0],wins:Number(wins[0]?.wins||0)});
    }
    return result;
  }

  async creator(chitId:string,userId:string){
    const [chit]:any=await this.sequelize.query(
      `SELECT * FROM chits WHERE id=:chitId AND creator_id=:userId`,
      {replacements:{chitId,userId}});
    if(!chit.length) throw new NotFoundException('Chit not found');
    const [financial]:any=await this.sequelize.query(
      `SELECT
       COALESCE((SELECT SUM(amount) FROM payments WHERE chit_id=:chitId AND status='VERIFIED'),0) AS collected,
       COALESCE((SELECT SUM(amount) FROM payouts WHERE chit_id=:chitId AND status='SETTLED'),0) AS settled_payouts,
       COALESCE((SELECT SUM(outstanding_amount) FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:chitId),0) AS outstanding,
       COALESCE((SELECT COUNT(*) FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:chitId AND o.status IN ('OVERDUE','DEFAULTED')),0) AS overdue_obligations,
       COALESCE((SELECT COUNT(*) FROM chit_months WHERE chit_id=:chitId AND status='COMPLETED'),0) AS completed_months,
       COALESCE((SELECT COUNT(*) FROM chit_months WHERE chit_id=:chitId),0) AS total_months`,
      {replacements:{chitId}});
    const [winners]:any=await this.sequelize.query(
      `SELECT 'FIXED_DRAW' AS type,d.chit_month_id,dw.chit_participant_id,dw.selected_at
       FROM draw_winners dw JOIN draws d ON d.id=dw.draw_id WHERE d.chit_id=:chitId
       UNION ALL
       SELECT 'AUCTION',a.chit_month_id,aw.chit_participant_id,aw.selected_at
       FROM auction_winners aw JOIN auctions a ON a.id=aw.auction_id WHERE a.chit_id=:chitId
       ORDER BY selected_at`,
      {replacements:{chitId}});
    const [payouts]:any=await this.sequelize.query(
      `SELECT p.* FROM payouts p WHERE p.chit_id=:chitId ORDER BY p.created_at DESC`,
      {replacements:{chitId}});
    const [auctions]:any=await this.sequelize.query(
      `SELECT a.id,a.chit_month_id,a.status,a.starts_at,a.ends_at,a.winning_bid_amount,a.payout_amount
       FROM auctions a WHERE a.chit_id=:chitId ORDER BY a.created_at DESC`,
      {replacements:{chitId}});
    return {
      chit:chit[0],
      financial:financial[0],
      winners,
      payouts,
      auctions,
      progress:{
        completedMonths:Number(financial[0].completed_months),
        totalMonths:Number(financial[0].total_months),
        percentage:Number(financial[0].total_months)?Math.round(Number(financial[0].completed_months)/Number(financial[0].total_months)*100):0
      }
    };
  }
}
