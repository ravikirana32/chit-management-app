import {Body,Controller,Param,Post,Module,UseGuards} from '@nestjs/common';
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
@Controller({path:'payment-collection',version:'v1'})
export class PaymentCollectionController{
 constructor(private readonly db:Sequelize){}
 @Post('obligations/:obligationId/pay') @ApiOperation({summary:'Member submits own UPI/cash payment'})
 async memberPay(@Param('obligationId')id:string,@Body()d:CollectionDto,@CurrentUser()u:any){
  const [o]:any=await this.db.query(`
   SELECT o.*,c.creator_id FROM contribution_obligations o
   JOIN chit_months m ON m.id=o.chit_month_id JOIN chits c ON c.id=m.chit_id
   WHERE o.id=:id AND o.chit_participant_id IN (SELECT id FROM chit_participants WHERE user_id=:u)`,
   {replacements:{id,u:u.sub}});
  if(!o.length)return {success:false,message:'Obligation not found'};
  const [p]:any=await this.db.query(`
   INSERT INTO payments(id,chit_id,chit_month_id,participant_id,obligation_id,amount,status,payment_method,recorded_by,recorded_by_role,historical_source,cash_receipt_note,transaction_reference,created_at,updated_at)
   VALUES(gen_random_uuid(),:chit,:month,:participant,:obligation,:amount,:status,:method,:u,'MEMBER','LIVE',:note,:ref,NOW(),NOW()) RETURNING *`,
   {replacements:{chit:o[0].chit_id,month:o[0].chit_month_id,participant:o[0].chit_participant_id,obligation:id,amount:d.amount,status:d.method==='UPI'?'PENDING':'PENDING',method:d.method,u:u.sub,note:d.cashReceiptNote??null,ref:d.transactionReference??null}});
  return {success:true,data:p[0]};
 }
 @Post('obligations/:obligationId/record-cash') @ApiOperation({summary:'Creator or agent records cash received'})
 async recordCash(@Param('obligationId')id:string,@Body()d:CollectionDto,@CurrentUser()u:any){
  if(d.method!=='CASH')return {success:false,message:'Use CASH for this endpoint'};
  const [o]:any=await this.db.query(`
   SELECT o.*,c.creator_id FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id JOIN chits c ON c.id=m.chit_id
   WHERE o.id=:id`,{replacements:{id}});
  if(!o.length)return {success:false,message:'Obligation not found'};
  const [role]:any=await this.db.query(`SELECT role FROM users WHERE id=:u`,{replacements:{u:u.sub}});
  const allowed=role[0]?.role==='CREATOR'||role[0]?.role==='AGENT'||o[0].creator_id===u.sub;
  if(!allowed)return {success:false,message:'Not authorized'};
  const [p]:any=await this.db.query(`
   INSERT INTO payments(id,chit_id,chit_month_id,participant_id,obligation_id,amount,status,payment_method,recorded_by,recorded_by_role,historical_source,cash_receipt_note,created_at,updated_at)
   VALUES(gen_random_uuid(),:chit,:month,:participant,:obligation,:amount,'VERIFIED','CASH',:u,:role,'LIVE',:note,NOW(),NOW()) RETURNING *`,
   {replacements:{chit:o[0].chit_id,month:o[0].chit_month_id,participant:o[0].chit_participant_id,obligation:id,amount:d.amount,u:u.sub,role:role[0]?.role??'CREATOR',note:d.cashReceiptNote??null}});
  return {success:true,data:p[0]};
 }
}
@Module({controllers:[PaymentCollectionController]}) export class PaymentCollectionModule{}
