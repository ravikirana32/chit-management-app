import {Body,Controller,Get,Module,Put,UseGuards,NotFoundException} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsOptional,IsString,MaxLength} from 'class-validator';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import {CurrentUser} from '../auth/current-user.decorator';
import {Sequelize} from 'sequelize-typescript';

class UpdateProfileDto{
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(120) name?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(10) preferredLanguage?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(80) timezone?:string;
}
class PaymentProfileDto{
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(255) upiId?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(150) bankName?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(100) accountNumber?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(20) ifsc?:string;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() cashAccepted?:boolean;
}
@ApiTags('Users') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'users',version:'1'})
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
 @Put('me')
 async updateMe(@Body() dto:UpdateProfileDto,@CurrentUser() user:any){
  const [rows]:any=await this.db.query(
   `UPDATE users SET
      name=COALESCE(:name,name),
      preferred_language=COALESCE(:language,preferred_language),
      timezone=COALESCE(:timezone,timezone),
      updated_at=NOW()
    WHERE id=:id
    RETURNING id,name,mobile_number AS mobile,normalized_mobile,status,preferred_language,timezone`,
   {replacements:{id:user.sub,name:dto.name??null,language:dto.preferredLanguage??null,timezone:dto.timezone??null}});
  if(!rows.length) throw new NotFoundException('User not found');
  const [roles]:any=await this.db.query(`SELECT role FROM user_roles WHERE user_id=:id`,{replacements:{id:user.sub}});
  return {success:true,data:{...rows[0],roles:roles.map((r:any)=>r.role)}};
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
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
})
export class UsersModule {}
