import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class StartDrawDto {
  @ApiProperty({example:'uuid'})
  @IsUUID()
  chitMonthId!:string;

  @ApiPropertyOptional({example:'2026-09-05T10:00:00+05:30',description:'When members may start expressing interest. Defaults to now.'})
  @IsOptional() @IsDateString()
  interestOpensAt?:string;

  @ApiPropertyOptional({example:'2026-09-05T18:00:00+05:30',description:'When interest closes. If omitted, interest remains open until the draw is run.'})
  @IsOptional() @IsDateString()
  interestClosesAt?:string;

  @ApiPropertyOptional({example:'2026-09-05T18:05:00+05:30',description:'Scheduled draw execution time. Agent still explicitly runs the draw.'})
  @IsOptional() @IsDateString()
  drawAt?:string;
}
