import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class RecoveryService {
  constructor(private readonly sequelize:Sequelize){}

  async createPlan(chitId:string,userId:string,dto:any){
    return this.sequelize.transaction(async transaction=>{
      const [rows]:any=await this.sequelize.query(
        `SELECT o.*,m.chit_id,c.creator_id
         FROM contribution_obligations o
         JOIN chit_months m ON m.id=o.chit_month_id
         JOIN chits c ON c.id=m.chit_id
         WHERE o.id=:obligationId AND m.chit_id=:chitId
         FOR UPDATE`,
        {replacements:{obligationId:dto.obligationId,chitId},transaction});
      if(!rows.length) throw new NotFoundException('Obligation not found');
      if(rows[0].creator_id!==userId) throw new ConflictException('Only creator can create recovery plans');
      if(Number(dto.installmentAmount)<=0 || Number(dto.installments)<=0)
        throw new BadRequestException('Installment amount and count must be positive');

      const outstanding=Number(rows[0].outstanding_amount);
      if(Number(dto.installmentAmount)*Number(dto.installments)<outstanding)
        throw new BadRequestException('Plan installments must cover the outstanding amount');

      const [plans]:any=await this.sequelize.query(
        `INSERT INTO recovery_plans
         (id,chit_id,chit_month_id,obligation_id,status,installment_amount,installment_count,
          first_due_date,created_by,created_at,updated_at)
         VALUES(gen_random_uuid(),:chitId,:monthId,:obligationId,'ACTIVE',:amount,:count,
                :firstDueDate,:userId,NOW(),NOW()) RETURNING *`,
        {replacements:{
          chitId,monthId:rows[0].chit_month_id,obligationId:dto.obligationId,
          amount:Number(dto.installmentAmount),count:dto.installments,
          firstDueDate:dto.firstDueDate,userId
        },transaction});
      await this.sequelize.query(
        `UPDATE contribution_obligations SET status='RECOVERY_PLAN',updated_at=NOW()
         WHERE id=:obligationId`,
        {replacements:{obligationId:dto.obligationId},transaction});
      return plans[0];
    });
  }
}
