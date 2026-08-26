import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
@Injectable()
export class PaymentWorkflowService {
 constructor(private readonly sequelize:Sequelize){}
 async submit(chitId:string,participantId:string,userId:string,dto:any){return this.sequelize.transaction(async transaction=>{
  const [r]:any=await this.sequelize.query(`SELECT o.*,m.chit_id,cp.user_id FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id JOIN chit_participants cp ON cp.id=o.chit_participant_id WHERE o.id=:oid AND m.chit_id=:chitId FOR UPDATE`,{replacements:{oid:dto.obligationId,chitId},transaction});
  if(!r.length)throw new NotFoundException('Contribution obligation not found'); const o=r[0];
  if(o.user_id!==userId||o.chit_participant_id!==participantId)throw new ConflictException('Payment does not belong to authenticated participant');
  const amount=Number(dto.amount); if(!Number.isFinite(amount)||amount<=0||amount>Number(o.outstanding_amount))throw new BadRequestException('Invalid payment amount');
  const [p]:any=await this.sequelize.query(`INSERT INTO payments (id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,payment_method,status,transaction_reference,payment_date,submitted_at,recorded_by,notes,created_at,updated_at) VALUES(gen_random_uuid(),:chitId,:mid,:pid,:oid,:amount,:method,'SUBMITTED',:ref,:date,NOW(),:user,:notes,NOW(),NOW()) RETURNING *`,{replacements:{chitId,mid:o.chit_month_id,pid:participantId,oid:dto.obligationId,amount,method:dto.paymentMethod,ref:dto.transactionReference,date:dto.paymentDate,user:userId,notes:dto.notes??null},transaction});
  return {payment:p[0]}; });}
 async verify(paymentId:string,verifier:string,dto:any){return this.sequelize.transaction(async transaction=>{
  const [r]:any=await this.sequelize.query(`SELECT p.*,o.due_amount,o.paid_amount,o.outstanding_amount,c.creator_id
 FROM payments p
 JOIN contribution_obligations o ON o.id=p.obligation_id
 JOIN chits c ON c.id=p.chit_id
 WHERE p.id=:id FOR UPDATE`,{replacements:{id:paymentId},transaction});
  if(!r.length)throw new NotFoundException('Payment not found'); const p=r[0]; if(p.creator_id!==verifier)throw new ConflictException('Only the chit creator can verify payments');
  if(p.status==='VERIFIED')throw new ConflictException('Payment already verified');
  if(dto.status==='REJECTED'){const [u]:any=await this.sequelize.query(`UPDATE payments SET status='REJECTED',verified_at=NOW(),verified_by=:v,notes=COALESCE(:n,notes),updated_at=NOW() WHERE id=:id RETURNING *`,{replacements:{id:paymentId,v:verifier,n:dto.notes??null},transaction});return {payment:u[0]};}
  if(dto.status!=='VERIFIED')throw new BadRequestException('Status must be VERIFIED or REJECTED');
  const paid=Number(p.paid_amount)+Number(p.amount),out=Math.max(0,Number(p.due_amount)-paid),status=out===0?'VERIFIED':'PARTIAL';
  await this.sequelize.query(`UPDATE contribution_obligations SET paid_amount=:paid,outstanding_amount=:out,status=:status,updated_at=NOW() WHERE id=:oid`,{replacements:{paid,out,status,oid:p.obligation_id},transaction});
  const [u]:any=await this.sequelize.query(`UPDATE payments SET status='VERIFIED',verified_at=NOW(),verified_by=:v,receipt_number=:r,notes=COALESCE(:n,notes),updated_at=NOW() WHERE id=:id RETURNING *`,{replacements:{id:paymentId,v:verifier,r:dto.receiptNumber??null,n:dto.notes??null},transaction});return {payment:u[0],obligation:{paidAmount:paid,outstandingAmount:out,status}};
 });}
}
