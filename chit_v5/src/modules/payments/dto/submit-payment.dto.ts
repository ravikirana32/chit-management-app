import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsDecimal, IsOptional, IsString, IsUUID } from 'class-validator';
export class SubmitPaymentDto { @ApiPropertyOptional() @IsOptional() @IsString() idempotencyKey?:string; @ApiProperty() @IsDecimal() amount!:string; @ApiProperty({example:'UPI'}) @IsString() paymentMethod!:string; @ApiProperty() @IsString() transactionReference!:string; @ApiProperty() @IsDateString() paymentDate!:string; @ApiProperty() @IsUUID() obligationId!:string; @ApiPropertyOptional() @IsOptional() @IsString() notes?:string; }
