import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FinalizeAuctionDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsUUID()
  auctionId!: string;
}
