import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class ReconciliationService {
  constructor(private readonly sequelize: Sequelize) {}

  async chitSummary(chitId:string,userId:string) {
    const [access]:any=await this.sequelize.query(
      `SELECT c.id,c.name,c.status,c.total_members,c.total_months
       FROM chits c
       LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
       LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:userId
       WHERE c.id=:chitId
         AND (c.creator_id=:userId OR ca.can_manage_chit=true OR ca.can_collect_cash=true OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN'))
       LIMIT 1`,
      {replacements:{chitId,userId}});
    if(!access.length) throw new ConflictException('Reconciliation permission is required for this chit');
    const [summary]:any=await this.sequelize.query(
      `SELECT
        COALESCE((SELECT SUM(amount) FROM payments WHERE chit_id=:chitId AND status='VERIFIED'),0) AS collected,
        COALESCE((SELECT SUM(amount) FROM payouts WHERE chit_id=:chitId AND status='SETTLED'),0) AS paid_out,
        COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE chit_id=:chitId AND entry_type='AGENT_COMMISSION'),0) AS agent_commission,
        COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE chit_id=:chitId AND entry_type='AUCTION_DISCOUNT'),0) AS auction_discount,
        COALESCE((SELECT SUM(outstanding_amount) FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:chitId),0) AS outstanding`,
      {replacements:{chitId}});
    return {chit:access[0],financial:summary[0]};
  }

  async monthly(chitId:string, monthId:string, userId:string) {
    const [rows]:any=await this.sequelize.query(
      `SELECT m.*,c.creator_id FROM chit_months m JOIN chits c ON c.id=m.chit_id
       WHERE m.id=:monthId AND m.chit_id=:chitId`,{replacements:{monthId,chitId}});
    if(!rows.length) throw new NotFoundException('Month not found');
    const [access]:any=await this.sequelize.query(
      `SELECT 1 FROM chits c
       LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
       LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:userId
       WHERE c.id=:chitId AND
         (c.creator_id=:userId OR ca.can_manage_chit=true OR ca.can_collect_cash=true OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN'))
       LIMIT 1`,
      {replacements:{chitId,userId}});
    if(!access.length) throw new ConflictException('Reconciliation permission is required for this chit');
    const [r]:any=await this.sequelize.query(
      `SELECT m.id,m.month_number,m.scheduled_amount,m.status,
       COALESCE((SELECT SUM(amount) FROM payments WHERE chit_month_id=m.id AND status='VERIFIED'),0) AS collected,
       COALESCE((SELECT SUM(amount) FROM payouts WHERE chit_month_id=m.id AND status='SETTLED'),0) AS settled_payout,
       COALESCE((SELECT SUM(outstanding_amount) FROM contribution_obligations WHERE chit_month_id=m.id),0) AS outstanding,
       COALESCE((SELECT COUNT(*) FROM contribution_obligations WHERE chit_month_id=m.id AND status IN ('PAID','VERIFIED','SETTLED','COMPLETED') AND outstanding_amount<=0),0) AS paid_members,
       COALESCE((SELECT COUNT(*) FROM contribution_obligations WHERE chit_month_id=m.id AND status IN ('OVERDUE','DEFAULTED')),0) AS overdue_members
       FROM chit_months m WHERE m.id=:monthId`,{replacements:{monthId}});
    return r[0];
  }

  async memberStatements(chitId:string,userId:string) {
    const [access]:any=await this.sequelize.query(`SELECT id FROM chits WHERE id=:chitId AND creator_id=:userId`,{replacements:{chitId,userId}});
    if(!access.length) throw new ConflictException('Reconciliation permission is required for this chit');
    const [rows]:any=await this.sequelize.query(
      `SELECT cp.id AS participant_id,cp.participant_sequence,u.name,u.mobile_number AS mobile,
        COALESCE(SUM(CASE WHEN le.amount>0 THEN le.amount ELSE 0 END),0) AS credits,
        COALESCE(SUM(CASE WHEN le.amount<0 THEN ABS(le.amount) ELSE 0 END),0) AS debits,
        COALESCE(SUM(le.amount),0) AS net_balance,
        COALESCE(SUM(o.outstanding_amount),0) AS outstanding
       FROM chit_participants cp JOIN users u ON u.id=cp.user_id
       LEFT JOIN ledger_entries le ON le.chit_participant_id=cp.id
       LEFT JOIN contribution_obligations o ON o.chit_participant_id=cp.id
       WHERE cp.chit_id=:chitId GROUP BY cp.id,cp.participant_sequence,u.name,u.mobile_number
       ORDER BY cp.participant_sequence`,{replacements:{chitId}});
    return rows;
  }

  async final(chitId:string,userId:string){
    const [chit]:any=await this.sequelize.query(`SELECT c.* FROM chits c
       LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
       LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:userId
       WHERE c.id=:chitId
         AND (c.creator_id=:userId OR ca.can_manage_chit=true OR ca.can_collect_cash=true OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN'))
       LIMIT 1`,{replacements:{chitId,userId}});
    if(!chit.length) throw new NotFoundException('Chit not found');
    const [months]:any=await this.sequelize.query(`SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE status='LOCKED')::int locked FROM chit_months WHERE chit_id=:chitId`,{replacements:{chitId}});
    const [ob]:any=await this.sequelize.query(`SELECT COALESCE(SUM(outstanding_amount),0) outstanding,COUNT(*) FILTER(WHERE status IN ('OVERDUE','DEFAULTED','RECOVERY_PLAN'))::int exceptions FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:chitId`,{replacements:{chitId}});
    const [payout]:any=await this.sequelize.query(`SELECT COALESCE(SUM(amount),0) settled,COUNT(*) FILTER(WHERE status='PENDING')::int pending FROM payouts WHERE chit_id=:chitId`,{replacements:{chitId}});
    const [winners]:any=await this.sequelize.query(`SELECT (SELECT COUNT(*) FROM draw_winners dw JOIN draws d ON d.id=dw.draw_id WHERE d.chit_id=:chitId)+(SELECT COUNT(*) FROM auction_winners aw JOIN auctions a ON a.id=aw.auction_id WHERE a.chit_id=:chitId) AS winners`,{replacements:{chitId}});
    const complete=Number(months[0].total)>0&&Number(months[0].locked)===Number(months[0].total)&&Number(ob[0].outstanding)===0&&Number(ob[0].exceptions)===0&&Number(payout[0].pending)===0;
    return {success:true,data:{chit:chit[0],months:months[0],obligations:ob[0],payouts:payout[0],winners:winners[0],complete}};
  }
}
