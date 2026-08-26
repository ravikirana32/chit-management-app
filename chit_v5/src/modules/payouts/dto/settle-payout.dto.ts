import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SettlePayoutDto {
  @ApiProperty({example:'SETTLED',enum:['SETTLED','FAILED']})
  @IsString()
  status!:string;

  @ApiProperty({example:'UPI'})
  @IsString()
  paymentMethod!:string;

  @ApiProperty({example:'UPI-PAYOUT-123'})
  @IsString()
  @MaxLength(255)
  transactionReference!:string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?:string;
}
