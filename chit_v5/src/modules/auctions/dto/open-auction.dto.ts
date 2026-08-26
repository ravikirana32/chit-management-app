import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class OpenAuctionDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsUUID()
  chitMonthId!: string;

  @ApiProperty({ example: 60, minimum: 1, maximum: 60 })
  @IsInt()
  @Min(1)
  @Max(60)
  durationMinutes!: number;
}
