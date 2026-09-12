import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PayoutSettlementComponentDto {
  @ApiProperty({ example: '8000.00' })
  @IsNumberString()
  amount!: string;

  @ApiProperty({ example: 'CASH', enum: ['CASH', 'UPI', 'BANK_TRANSFER'] })
  @IsIn(['CASH', 'UPI', 'BANK_TRANSFER'])
  paymentMethod!: string;

  @ApiPropertyOptional({ example: 'CASH-REC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SettlePayoutDto {
  @ApiProperty({ example: 'SETTLED', enum: ['SETTLED', 'FAILED'] })
  @IsIn(['SETTLED', 'FAILED'])
  status!: string;

  /**
   * Legacy full-payment contract.
   * Keep these fields so existing mobile/API callers continue to work.
   */
  @ApiPropertyOptional({ example: 'UPI', enum: ['CASH', 'UPI', 'BANK_TRANSFER'] })
  @IsOptional()
  @IsIn(['CASH', 'UPI', 'BANK_TRANSFER'])
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'UPI-PAYOUT-123' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionReference?: string;

  /**
   * New additive contract.
   *
   * Full cash:
   * [{ amount: "20000", paymentMethod: "CASH", transactionReference: "CASH-1" }]
   *
   * Full UPI:
   * [{ amount: "20000", paymentMethod: "UPI", transactionReference: "UPI-1" }]
   *
   * Split:
   * [
   *   { amount: "8000", paymentMethod: "CASH", transactionReference: "CASH-1" },
   *   { amount: "12000", paymentMethod: "UPI", transactionReference: "UPI-1" }
   * ]
   */
  @ApiPropertyOptional({ type: [PayoutSettlementComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayoutSettlementComponentDto)
  components?: PayoutSettlementComponentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
