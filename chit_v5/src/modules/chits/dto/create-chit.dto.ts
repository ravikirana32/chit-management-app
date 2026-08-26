import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsArray,IsBoolean,IsUUID,IsDateString,IsDecimal,IsEnum,IsInt,IsNotEmpty,IsOptional,IsString,Max,Min} from 'class-validator';
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
 @ApiPropertyOptional({example:'200000.00'}) @IsOptional() @IsDecimal() firstMonthlyAmount?:string;
 @ApiPropertyOptional({type:[String],example:['200000.00','210000.00']}) @IsOptional() @IsArray() @IsDecimal({each:true}) monthlyAmounts?:string[];
 @ApiPropertyOptional({type:[Number],example:[3,8]}) @IsOptional() @IsArray() @IsInt({each:true}) agentMonthNumbers?:number[];
 @ApiPropertyOptional({example:'00000000-0000-0000-0000-000000000001'}) @IsOptional() @IsUUID() agentId?:string;
}
