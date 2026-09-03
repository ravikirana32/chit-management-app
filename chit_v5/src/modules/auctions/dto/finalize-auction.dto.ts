import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class FinalizeAuctionDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  auctionId?: string;
}
