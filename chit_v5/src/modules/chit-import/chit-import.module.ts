import {Body,Controller,Get,Param,Post,Module,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsArray,IsDateString,IsIn,IsInt,IsNumberString,IsOptional,IsString,ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class MemberRow{
 @ApiProperty() @IsString() memberId!:string;
 @ApiProperty() @IsString() name!:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() mobile?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() upiId?:string;
 @ApiProperty({required:false}) @IsOptional() @IsInt() sequence?:number;
}
class PaymentRow{
 @ApiProperty() @IsInt() monthNumber!:number;
 @ApiProperty() @IsString() memberId!:string;
 @ApiProperty() @IsNumberString() amount!:string;
 @ApiProperty({enum:['UPI','CASH','BANK_TRANSFER','OTHER']}) @IsIn(['UPI','CASH','BANK_TRANSFER','OTHER']) method!:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() reference?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() notes?:string;
}
class MonthRow{
 @ApiProperty() @IsInt() monthNumber!:number;
 @ApiProperty() @IsNumberString() amount!:string;
 @ApiProperty({required:false}) @IsOptional() @IsDateString() completedAt?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() winnerMemberId?:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() winnerName?:string;
 @ApiProperty({required:false}) @IsString() monthType?:string;
}
class ImportDto{
 @ApiProperty() @IsString() chitId!:string;
 @ApiProperty() @IsInt() currentMonthNumber!:number;
 @ApiProperty({type:[MemberRow]}) @IsArray() @ValidateNested({each:true}) @Type(()=>MemberRow) members!:MemberRow[];
 @ApiProperty({type:[MonthRow]}) @IsArray() @ValidateNested({each:true}) @Type(()=>MonthRow) months!:MonthRow[];
 @ApiProperty({type:[PaymentRow]}) @IsArray() @ValidateNested({each:true}) @Type(()=>PaymentRow) payments!:PaymentRow[];
}

@ApiTags('Existing Chit Import') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chit-import',version:'v1'})
export class ChitImportController{
 constructor(private readonly db:Sequelize){}
 @Post('validate') @ApiOperation({summary:'Validate historical chit data before import'})
 async validate(@Body()d:ImportDto,@CurrentUser()u:any){
  const errors:string[]=[]; const warnings:string[]=[];
  const nums=new Set<number>(); d.months.forEach(m=>{if(nums.has(m.monthNumber))errors.push(`Duplicate month ${m.monthNumber}`);nums.add(m.monthNumber)});
  const memberIds=new Set(d.members.map(x=>x.memberId));
  d.payments.forEach(p=>{if(!memberIds.has(p.memberId))errors.push(`Payment references unknown member ${p.memberId}`)});
  if(d.currentMonthNumber<=0)errors.push('currentMonthNumber must be positive');
  const historical=d.months.filter(m=>m.monthNumber<d.currentMonthNumber);
  if(!historical.length)warnings.push('No historical months supplied');
  return {success:errors.length===0,data:{valid:errors.length===0,errors,warnings,counts:{members:d.members.length,months:d.months.length,payments:d.payments.length,historicalMonths:historical.length}}};
 }
 @Post('create-batch') @ApiOperation({summary:'Create a draft historical import batch'})
 async batch(@Body()d:ImportDto,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`INSERT INTO chit_import_batches(chit_id,current_month_number,imported_by,status,summary) VALUES(:c,:m,:u,'DRAFT',:s::jsonb) RETURNING *`,{replacements:{c:d.chitId,m:d.currentMonthNumber,u:u.sub,s:JSON.stringify({members:d.members.length,months:d.months.length,payments:d.payments.length})}});
  return {success:true,data:r[0]};
 }
 @Get('batches/:batchId') async get(@Param('batchId')id:string,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`SELECT * FROM chit_import_batches WHERE id=:id AND imported_by=:u`,{replacements:{id,u:u.sub}});
  return {success:!!r.length,data:r[0]??null};
 }
 @Post('batches/:batchId/review') async review(@Param('batchId')id:string,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`UPDATE chit_import_batches SET status='REVIEWED',reviewed_at=NOW() WHERE id=:id AND imported_by=:u RETURNING *`,{replacements:{id,u:u.sub}});
  return {success:!!r.length,data:r[0]??null};
 }
}
@Module({controllers:[ChitImportController]}) export class ChitImportModule{}
