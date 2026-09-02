import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class MonthCloseService {
 constructor(private readonly sequelize:Sequelize){}
 async close(monthId:string,userId:string){return this.sequelize.transaction(async transaction=>{
  const [rows]:any=await this.sequelize.query(`SELECT m.*,c.creator_id FROM chit_months m JOIN chits c ON c.id=m.chit_id WHERE m.id=:monthId FOR UPDATE`,{replacements:{monthId},transaction});
  if(!rows.length)throw new NotFoundException('Month not found');const m=rows[0];
  const [access]:any=await this.sequelize.query(
    `SELECT 1 FROM chits c
     LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
     LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:userId
     WHERE c.id=:chitId AND
       (c.creator_id=:userId OR (ag.id IS NOT NULL AND (ca.can_manage_chit=true OR ca.can_collect_cash=true)) OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN'))
     LIMIT 1`,
    {replacements:{chitId:m.chit_id,userId},transaction});
  if(!access.length)throw new ConflictException('Month close permission is required for this chit');
  if(m.status==='LOCKED')return m;if(m.status!=='COMPLETED')throw new ConflictException('Month can only be locked after successful auction/draw completion');
  const [open]:any=await this.sequelize.query(`SELECT COUNT(*)::int AS count FROM contribution_obligations WHERE chit_month_id=:monthId AND status IN('DUE','PENDING','PARTIAL','OVERDUE','RECOVERY_PLAN')`,{replacements:{monthId},transaction});if(Number(open[0].count)>0)throw new ConflictException('Cannot lock month with unresolved contribution obligations');
  const [payout]:any=await this.sequelize.query(`SELECT COUNT(*)::int AS count FROM payouts WHERE chit_month_id=:monthId AND status='PENDING'`,{replacements:{monthId},transaction});if(Number(payout[0].count)>0)throw new ConflictException('Cannot lock month with pending payout');
  const [updated]:any=await this.sequelize.query(`UPDATE chit_months SET status='LOCKED',locked_at=NOW(),locked_by=:userId,updated_at=NOW() WHERE id=:monthId RETURNING *`,{replacements:{monthId,userId},transaction});
  await this.sequelize.query(`
    UPDATE chits
    SET completed_months=(SELECT COUNT(*) FROM chit_months WHERE chit_id=:chitId AND status IN ('COMPLETED','LOCKED')),
        status=CASE WHEN (SELECT COUNT(*) FROM chit_months WHERE chit_id=:chitId AND status='LOCKED')>=total_months THEN 'COMPLETED' ELSE status END,
        completed_at=CASE WHEN (SELECT COUNT(*) FROM chit_months WHERE chit_id=:chitId AND status='LOCKED')>=total_months THEN COALESCE(completed_at,NOW()) ELSE completed_at END,
        updated_at=NOW()
    WHERE id=:chitId`,{replacements:{chitId:m.chit_id},transaction});
  return updated[0];
 });}
}
