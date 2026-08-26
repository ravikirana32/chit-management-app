import {Body,Controller,Param,Post,Module,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsOptional,IsString,MaxLength} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class ProofDto{
 @ApiProperty() @IsString() storageKey!:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(255) originalFilename?:string;
 @ApiProperty() @IsString() mimeType!:string;
 @ApiProperty() @IsString() fileSize!:string;
}
class DisputeDto{
 @ApiProperty() @IsString() @MaxLength(2000) reason!:string;
}
@ApiTags('Payment Proof') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'payments',version:'v1'})
export class PaymentProofController{
 constructor(private readonly db:Sequelize){}
 @Post(':paymentId/proof') @ApiOperation({summary:'Attach payment proof metadata; file bytes should be stored in private object storage'})
 async addProof(@Param('paymentId')id:string,@Body()d:ProofDto,@CurrentUser()u:any){
  const [p]:any=await this.db.query(`SELECT id FROM payments WHERE id=:id AND recorded_by=:u OR id=:id`,{replacements:{id,u:u.sub}});
  if(!p.length)return {success:false,message:'Payment not found'};
  const [r]:any=await this.db.query(`
   INSERT INTO payment_proofs(payment_id,uploaded_by,storage_key,original_filename,mime_type,file_size)
   VALUES(:p,:u,:key,:name,:mime,:size) RETURNING *`,
   {replacements:{p:id,u:u.sub,key:d.storageKey,name:d.originalFilename??null,mime:d.mimeType,size:d.fileSize}});
  await this.db.query(`UPDATE payments SET status='PENDING',claimed_at=COALESCE(claimed_at,NOW()) WHERE id=:id`,{replacements:{id}});
  return {success:true,data:r[0]};
 }
 @Post(':paymentId/dispute') @ApiOperation({summary:'Open payment dispute'})
 async dispute(@Param('paymentId')id:string,@Body()d:DisputeDto,@CurrentUser()u:any){
  const [p]:any=await this.db.query(`SELECT id FROM payments WHERE id=:id`,{replacements:{id}});
  if(!p.length)return {success:false,message:'Payment not found'};
  const [r]:any=await this.db.query(`INSERT INTO payment_disputes(payment_id,opened_by,reason) VALUES(:p,:u,:reason) RETURNING *`,{replacements:{p:id,u:u.sub,reason:d.reason}});
  await this.db.query(`UPDATE payments SET status='DISPUTED' WHERE id=:id`,{replacements:{id}});
  return {success:true,data:r[0]};
 }
 @Post(':paymentId/verify') @ApiOperation({summary:'Authorized creator/agent/winner verifies payment'})
 async verify(@Param('paymentId')id:string,@CurrentUser()u:any){
  const [role]:any=await this.db.query(`SELECT role FROM users WHERE id=:u`,{replacements:{u:u.sub}});
  if(!['CREATOR','AGENT','WINNER'].includes(role[0]?.role))return {success:false,message:'Not authorized'};
  const [r]:any=await this.db.query(`UPDATE payments SET status='VERIFIED',verified_at=NOW(),verified_by=:u WHERE id=:id AND status<>'DISPUTED' RETURNING *`,{replacements:{id,u:u.sub}});
  return {success:!!r.length,data:r[0]??null};
 }
 @Post(':paymentId/reject') @ApiOperation({summary:'Reject a claimed payment'})
 async reject(@Param('paymentId')id:string,@Body()d:DisputeDto,@CurrentUser()u:any){
  const [role]:any=await this.db.query(`SELECT role FROM users WHERE id=:u`,{replacements:{u:u.sub}});
  if(!['CREATOR','AGENT','WINNER'].includes(role[0]?.role))return {success:false,message:'Not authorized'};
  const [r]:any=await this.db.query(`UPDATE payments SET status='REJECTED',rejection_reason=:reason WHERE id=:id RETURNING *`,{replacements:{id,u:u.sub,reason:d.reason}});
  return {success:!!r.length,data:r[0]??null};
 }
}
@Module({controllers:[PaymentProofController]}) export class PaymentProofModule{}
