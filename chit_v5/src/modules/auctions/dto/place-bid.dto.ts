import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsUUID } from 'class-validator';

export class PlaceBidDto {
  @ApiProperty({ example: '25000.00', description: 'Discount offered against the chit amount' })
  @IsDecimal()
  bidAmount!: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsUUID()
  participantId!: string;
}
