import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ReopenAuctionDto {
  @ApiProperty({ example: 10, minimum: 1, maximum: 60, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  durationMinutes?: number;
}
