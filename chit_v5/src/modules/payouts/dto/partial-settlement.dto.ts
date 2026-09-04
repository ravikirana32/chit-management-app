import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PartialSettlementDto {
  @ApiProperty({ example: 5000, description: 'Amount paid in this settlement. May be less than the outstanding payout.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: ['CASH', 'UPI', 'BANK_TRANSFER'], example: 'UPI' })
  @IsString()
  @IsIn(['CASH', 'UPI', 'BANK_TRANSFER'])
  paymentMethod!: string;

  @ApiProperty({ example: 'UPI-123456' })
  @IsString()
  @MaxLength(255)
  transactionReference!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
