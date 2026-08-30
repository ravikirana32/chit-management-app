import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsArray,IsBoolean,IsDateString,IsDecimal,IsEnum,IsInt,IsNotEmpty,IsOptional,IsString,IsUUID,Max,Min} from 'class-validator';
import {ChitType} from '../../../common/enums/chit.enums';

export class CreateChitDto{
 @ApiProperty({example:'Friends Chit'}) @IsString() @IsNotEmpty() name!:string;
 @ApiPropertyOptional() @IsOptional() @IsString() description?:string;
 @ApiProperty({enum:ChitType}) @IsEnum(ChitType) chitType!:ChitType;
 @ApiProperty({example:20}) @IsInt() @Min(2) totalMembers!:number;
 @ApiProperty({example:20}) @IsInt() @Min(2) totalMonths!:number;
 @ApiProperty({example:'2026-09-05'}) @IsDateString() startDate!:string;
 @ApiProperty({example:5}) @IsInt() @Min(1) @Max(31) dueDay!:number;
 @ApiProperty({example:true}) @IsBoolean() creatorParticipates!:boolean;

 @ApiPropertyOptional({example:'5000.00',description:'Per-member monthly contribution. Every active member is obligated for this amount, including AGENT_CHIT months.'})
 @IsOptional() @IsDecimal() firstMonthlyAmount?:string;

 @ApiPropertyOptional({example:'25000.00',description:'Chit face/value amount.'})
 @IsOptional() @IsDecimal() totalChitAmount?:string;

 @ApiPropertyOptional({
   type:[String],
   example:['5000.00','5000.00','5000.00','5000.00','5000.00'],
   description:'Per-member contribution amount for every month.'
 })
 @IsOptional() @IsArray() @IsDecimal({}, {each:true}) monthlyAmounts?:string[];

 @ApiPropertyOptional({
   type:[String],
   example:['20000.00','21000.00','23000.00','25000.00','30000.00'],
   description:'Payout amount for every month. FIXED_DRAW ACTION months pay the selected member. AGENT_CHIT months pay the configured agent and do not run a draw.'
 })
 @IsOptional() @IsArray() @IsDecimal({}, {each:true}) fixedDrawPayoutAmounts?:string[];

 @ApiPropertyOptional({
   type:[Number],
   example:[3,8],
   description:'Months that the creator wants to configure as AGENT_CHIT months. These months have no draw; all members still contribute.'
 })
 @IsOptional() @IsArray() @IsInt({each:true}) agentMonthNumbers?:number[];

 @ApiPropertyOptional({
   example:'00000000-0000-0000-0000-000000000001',
   description:'Agent user ID or Agent record ID. Backend resolves either to the active Agent record. Required when agentMonthNumbers is not empty.'
 })
 @IsOptional() @IsUUID() agentId?:string;
}
