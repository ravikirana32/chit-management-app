import {Body,Controller,Get,Module,Put,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsOptional,IsString,MaxLength} from 'class-validator';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';
import {Sequelize} from 'sequelize-typescript';
class PaymentProfileDto{
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(255) upiId?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(150) bankName?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(100) accountNumber?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(20) ifsc?:string;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() cashAccepted?:boolean;
}
@ApiTags('Users') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'users',version:'v1'})
class UsersController{
 constructor(private readonly db:Sequelize){}
 @Get('me')
 async me(@CurrentUser() user:any){
  const [rows]:any=await this.db.query(`SELECT id,name,mobile_number AS mobile,normalized_mobile,status,preferred_language,timezone FROM users WHERE id=:id`,{replacements:{id:user.sub}});
  if(!rows.length)return {success:true,data:{id:user.sub,mobile:user.mobile,roles:[]}};
  const [roles]:any=await this.db.query(`SELECT role FROM user_roles WHERE user_id=:id`,{replacements:{id:user.sub}});
  const [participant]:any=await this.db.query(`SELECT id FROM chit_participants WHERE user_id=:id AND status IN ('ACTIVE','INVITED') ORDER BY created_at DESC LIMIT 1`,{replacements:{id:user.sub}});
  return {success:true,data:{...rows[0],roles:roles.map((r:any)=>r.role),participantId:participant[0]?.id??null}};
 }
 @Put('me/payment-profile')
 async paymentProfile(@Body() dto:PaymentProfileDto,@CurrentUser() user:any){
  const [rows]:any=await this.db.query(
   `INSERT INTO user_payment_profiles(user_id,upi_id,bank_name,account_number,ifsc,cash_accepted,created_at,updated_at)
    VALUES(:user,:upi,:bank,:account,:ifsc,:cash,NOW(),NOW())
    ON CONFLICT DO NOTHING RETURNING *`,
   {replacements:{user:user.sub,upi:dto.upiId??null,bank:dto.bankName??null,account:dto.accountNumber??null,ifsc:dto.ifsc??null,cash:dto.cashAccepted??false}});
  if(!rows.length){
   const [u]:any=await this.db.query(`UPDATE user_payment_profiles SET upi_id=:upi,bank_name=:bank,account_number=:account,ifsc=:ifsc,cash_accepted=:cash,updated_at=NOW() WHERE user_id=:user RETURNING *`,{replacements:{user:user.sub,upi:dto.upiId??null,bank:dto.bankName??null,account:dto.accountNumber??null,ifsc:dto.ifsc??null,cash:dto.cashAccepted??false}});
   return {success:true,data:u[0]};
  }
  return {success:true,data:rows[0]};
 }
}
@Module({controllers:[UsersController]}) export class UsersModule{}
