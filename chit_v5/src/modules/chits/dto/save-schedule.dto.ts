import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsDecimal, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ChitMonthType } from '../../../common/enums/chit.enums';

export class ScheduleItemDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) monthNumber!: number;
  @ApiProperty({ example: '2026-09-05' }) @IsDateString() scheduledDate!: string;
  @ApiProperty({ example: '200000.00' }) @IsDecimal() scheduledAmount!: string;
  @ApiProperty({ enum: ChitMonthType }) @IsEnum(ChitMonthType) monthType!: ChitMonthType;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() agentId?: string;
}

export class SaveScheduleDto {
  @ApiProperty({ type: [ScheduleItemDto] })
  @IsArray() @ArrayMinSize(1) @Type(() => ScheduleItemDto)
  months!: ScheduleItemDto[];
}
