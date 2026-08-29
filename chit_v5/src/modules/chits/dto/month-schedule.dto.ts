import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsDecimal, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ChitMonthType } from '../../../common/enums/chit.enums';

export class ChitMonthScheduleItemDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) monthNumber!: number;
  @ApiProperty({ example: '2026-09-05' }) @IsDateString() scheduledDate!: string;
  @ApiProperty({ example: '1000.00' }) @IsDecimal() scheduledAmount!: string;
  @ApiProperty({ enum: ChitMonthType }) @IsEnum(ChitMonthType) monthType!: ChitMonthType;
  @ApiPropertyOptional({ description: 'Required only for AGENT_CHIT months' }) @IsOptional() @IsUUID() agentId?: string;
}

export class SaveChitScheduleDto {
  @ApiProperty({ type: [ChitMonthScheduleItemDto] })
  @IsArray() @ArrayMinSize(1) @Type(() => ChitMonthScheduleItemDto)
  months!: ChitMonthScheduleItemDto[];

  @ApiPropertyOptional({ example: '5000.00', description: 'Chit face/value amount. If omitted, existing value is retained.' })
  @IsOptional() @IsDecimal()
  totalChitAmount?: string;
}
