import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
export class VerifyPaymentDto { @ApiProperty({enum:['VERIFIED','REJECTED']}) @IsString() status!:string; @ApiPropertyOptional() @IsOptional() @IsString() notes?:string; @ApiPropertyOptional() @IsOptional() @IsString() receiptNumber?:string; }
