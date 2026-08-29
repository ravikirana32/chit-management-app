import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class MonthCloseService {
 constructor(private readonly sequelize:Sequelize){}
 async close(monthId:string,userId:string){return this.sequelize.transaction(async transaction=>{
  const [rows]:any=await this.sequelize.query(`SELECT m.*,c.creator_id FROM chit_months m JOIN chits c ON c.id=m.chit_id WHERE m.id=:monthId FOR UPDATE`,{replacements:{monthId},transaction});
  if(!rows.length)throw new NotFoundException('Month not found');const m=rows[0];if(m.creator_id!==userId)throw new ConflictException('Only creator can close month');if(m.status==='LOCKED')return m;if(m.status!=='COMPLETED')throw new ConflictException('Month can only be locked after successful auction/draw completion');
  const [open]:any=await this.sequelize.query(`SELECT COUNT(*)::int AS count FROM contribution_obligations WHERE chit_month_id=:monthId AND status IN('DUE','PENDING','PARTIAL','OVERDUE','RECOVERY_PLAN')`,{replacements:{monthId},transaction});if(Number(open[0].count)>0)throw new ConflictException('Cannot lock month with unresolved contribution obligations');
  const [payout]:any=await this.sequelize.query(`SELECT COUNT(*)::int AS count FROM payouts WHERE chit_month_id=:monthId AND status='PENDING'`,{replacements:{monthId},transaction});if(Number(payout[0].count)>0)throw new ConflictException('Cannot lock month with pending payout');
  const [updated]:any=await this.sequelize.query(`UPDATE chit_months SET status='LOCKED',locked_at=NOW(),locked_by=:userId,updated_at=NOW() WHERE id=:monthId RETURNING *`,{replacements:{monthId,userId},transaction});return updated[0];
 });}
}
