import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class RecoveryInstallmentService {
  constructor(private readonly sequelize: Sequelize) {}

  async createInstallments(planId:string,actor:string){
    return this.sequelize.transaction(async transaction=>{
      const [rows]:any=await this.sequelize.query(
        `SELECT rp.*,c.creator_id
         FROM recovery_plans rp JOIN chits c ON c.id=rp.chit_id
         WHERE rp.id=:planId FOR UPDATE`,
        {replacements:{planId},transaction});
      if(!rows.length) throw new NotFoundException('Recovery plan not found');
      if(rows[0].creator_id!==actor) throw new ConflictException('Only creator can generate installments');
      if(rows[0].status!=='ACTIVE') throw new ConflictException('Recovery plan is not active');

      const [existing]:any=await this.sequelize.query(
        `SELECT COUNT(*)::int AS count FROM recovery_installments WHERE plan_id=:planId`,
        {replacements:{planId},transaction});
      if(existing[0].count>0) return existing;

      const amount=Number(rows[0].installment_amount);
      const count=Number(rows[0].installment_count);
      const first=new Date(rows[0].first_due_date);
      const created:any[]=[];

      for(let i=0;i<count;i++){
        const due=new Date(first);
        due.setMonth(due.getMonth()+i);
        const [r]:any=await this.sequelize.query(
          `INSERT INTO recovery_installments
           (id,plan_id,installment_number,due_date,amount,status,created_at,updated_at)
           VALUES(gen_random_uuid(),:planId,:number,:due,:amount,'DUE',NOW(),NOW())
           RETURNING *`,
          {replacements:{planId,number:i+1,due:due.toISOString().slice(0,10),amount},transaction});
        created.push(r[0]);
      }
      return created;
    });
  }
}
