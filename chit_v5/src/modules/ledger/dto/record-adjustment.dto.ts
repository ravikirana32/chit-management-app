import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RecordAdjustmentDto {
  @ApiProperty({example:'-500.00',description:'Signed amount. Debit is negative, credit is positive.'})
  @IsDecimal()
  amount!: string;

  @ApiProperty({example:'PAYMENT_CORRECTION'})
  @IsString()
  @MaxLength(80)
  entryType!: string;

  @ApiProperty({example:'Correction for duplicate cash receipt'})
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  participantId?: string;
}
