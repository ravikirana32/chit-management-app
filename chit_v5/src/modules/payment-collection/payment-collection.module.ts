import {Body, Controller, Param, Post, Module, UseGuards, NotFoundException, ConflictException} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsIn,IsNumberString,IsOptional,IsString} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class CollectionDto{
 @ApiProperty({enum:['UPI','CASH']}) @IsIn(['UPI','CASH']) method!:string;
 @ApiProperty() @IsNumberString() amount!:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() transactionReference?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() cashReceiptNote?:string;
}
@ApiTags('Payment Collection') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'payment-collection',version:'1'})
export class PaymentCollectionController{
 constructor(private readonly db:Sequelize){}
 @Post('obligations/:obligationId/pay') @ApiOperation({summary:'Member submits own UPI/cash payment'})
 async memberPay(@Param('obligationId')id:string,@Body()d:CollectionDto,@CurrentUser()u:any){
  return this.db.transaction(async transaction=>{
   const [o]:any=await this.db.query(
    `SELECT o.*,m.chit_id,cp.user_id
     FROM contribution_obligations o
     JOIN chit_months m ON m.id=o.chit_month_id
     JOIN chit_participants cp ON cp.id=o.chit_participant_id
     WHERE o.id=:id AND cp.user_id=:u FOR UPDATE OF o`,
    {replacements:{id,u:u.sub},transaction});
   if(!o.length)throw new NotFoundException('Obligation not found');
   const row=o[0]; const amount=Number(d.amount);
   if(!Number.isFinite(amount)||amount<=0||amount>Number(row.outstanding_amount))
    throw new ConflictException('Invalid payment amount');
   const [p]:any=await this.db.query(
    `INSERT INTO payments
      (id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,status,payment_method,
       recorded_by,transaction_reference,payment_date,submitted_at,notes,created_at,updated_at)
     VALUES(gen_random_uuid(),:chit,:month,:participant,:obligation,:amount,'SUBMITTED',:method,
       :u,:ref,NOW(),NOW(),:note,NOW(),NOW()) RETURNING *`,
    {replacements:{chit:row.chit_id,month:row.chit_month_id,participant:row.chit_participant_id,obligation:id,amount,method:d.method,u:u.sub,ref:d.transactionReference??null,note:d.cashReceiptNote??null},transaction});
   return {success:true,data:p[0],nextStep:'Payment must be verified before it counts toward collections.'};
  });
 }
 @Post('obligations/:obligationId/record-cash') @ApiOperation({summary:'Creator or assigned agent records cash received'})
 async recordCash(@Param('obligationId')id:string,@Body()d:CollectionDto,@CurrentUser()u:any){
  if(d.method!=='CASH')throw new ConflictException('Use CASH for this endpoint');
  return this.db.transaction(async transaction=>{
   const [o]:any=await this.db.query(
    `SELECT o.*,m.chit_id,cp.chit_id AS participant_chit_id,c.creator_id
     FROM contribution_obligations o
     JOIN chit_months m ON m.id=o.chit_month_id
     JOIN chit_participants cp ON cp.id=o.chit_participant_id
     JOIN chits c ON c.id=m.chit_id
     WHERE o.id=:id FOR UPDATE OF o`,
    {replacements:{id},transaction});
   if(!o.length)throw new NotFoundException('Obligation not found');
   const row=o[0];
   const [agentAccess]:any=await this.db.query(
    `SELECT 1 FROM chit_agent_assignments ca JOIN agents ag ON ag.id=ca.agent_id
     WHERE ca.chit_id=:chit AND ag.user_id=:u AND ag.status='ACTIVE' AND ca.active=true
       AND ca.can_collect_cash=true LIMIT 1`,
    {replacements:{chit:row.chit_id,u:u.sub},transaction});
   const [role]:any=await this.db.query(
    `SELECT role FROM user_roles WHERE user_id=:u
     ORDER BY CASE role WHEN 'ADMIN' THEN 1 WHEN 'CREATOR' THEN 2 WHEN 'AGENT' THEN 3 ELSE 9 END LIMIT 1`,
    {replacements:{u:u.sub},transaction});
   const allowed=row.creator_id===u.sub||['ADMIN','CREATOR'].includes(role[0]?.role)||agentAccess.length>0;
   if(!allowed)throw new ConflictException('Cash collection permission is required for this chit');
   const amount=Number(d.amount);
   if(!Number.isFinite(amount)||amount<=0||amount>Number(row.outstanding_amount))
    throw new ConflictException('Invalid cash amount');
   const [p]:any=await this.db.query(
    `INSERT INTO payments
      (id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,status,payment_method,
       recorded_by,transaction_reference,payment_date,submitted_at,notes,created_at,updated_at)
     VALUES(gen_random_uuid(),:chit,:month,:participant,:obligation,:amount,'VERIFIED','CASH',:u,:ref,NOW(),NOW(),:note,NOW(),NOW()) RETURNING *`,
    {replacements:{chit:row.chit_id,month:row.chit_month_id,participant:row.chit_participant_id,obligation:id,amount,u:u.sub,ref:d.transactionReference??null,note:d.cashReceiptNote??null},transaction});
   const paid=Number(row.paid_amount)+amount; const outstanding=Math.max(0,Number(row.due_amount)-paid);
   await this.db.query(
    `UPDATE contribution_obligations SET paid_amount=:paid,outstanding_amount=:out,status=:status,updated_at=NOW() WHERE id=:id`,
    {replacements:{id,paid,out:outstanding,status:outstanding===0?'PAID':'PARTIAL'},transaction});
   return {success:true,data:p[0],obligation:{paidAmount:paid,outstandingAmount:outstanding,status:outstanding===0?'PAID':'PARTIAL'}};
  });
 }
}
@Module({controllers:[PaymentCollectionController]}) export class PaymentCollectionModule{}
