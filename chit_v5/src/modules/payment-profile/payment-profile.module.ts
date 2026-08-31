import {Body,Controller,Get,Module,Put,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsIn,IsOptional,IsString,MaxLength} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class PaymentProfileDto{
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(255) upiId?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() @MaxLength(255) upiName?:string;
 @ApiProperty({required:false,enum:['UPI','CASH']}) @IsOptional() @IsIn(['UPI','CASH']) preferredMethod?:string;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() cashEnabled?:boolean;
}
@ApiTags('Payment Profile') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'profile/payment-details',version:'1'})
export class PaymentProfileController{
 constructor(private readonly db:Sequelize){}
 @Get() async get(@CurrentUser()u:any){
  const [r]:any=await this.db.query(`SELECT * FROM member_payment_profiles WHERE user_id=:u`,{replacements:{u:u.sub}});
  return {success:true,data:r[0]??{user_id:u.sub,preferred_method:'UPI',cash_enabled:true}};
 }
 @Put() async put(@Body()d:PaymentProfileDto,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`
   INSERT INTO member_payment_profiles(user_id,upi_id,upi_name,preferred_method,cash_enabled,updated_at)
   VALUES(:u,:upi,:name,COALESCE(:method,'UPI'),COALESCE(:cash,true),NOW())
   ON CONFLICT(user_id) DO UPDATE SET upi_id=:upi,upi_name=:name,preferred_method=COALESCE(:method,member_payment_profiles.preferred_method),cash_enabled=COALESCE(:cash,member_payment_profiles.cash_enabled),updated_at=NOW()
   RETURNING *`,{replacements:{u:u.sub,upi:d.upiId??null,name:d.upiName??null,method:d.preferredMethod??null,cash:d.cashEnabled}});
  return {success:true,data:r[0]};
 }
}
@Module({controllers:[PaymentProfileController]}) export class PaymentProfileModule{}
