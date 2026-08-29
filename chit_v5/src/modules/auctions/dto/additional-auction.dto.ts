import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class AdditionalAuctionDto {
  @ApiProperty({ example: 10, minimum: 1, maximum: 60 })
  @IsInt() @Min(1) @Max(60)
  durationMinutes!: number;
}
