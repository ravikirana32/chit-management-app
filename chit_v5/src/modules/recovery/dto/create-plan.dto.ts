import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsDecimal, IsInt, IsUUID, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty() @IsUUID() obligationId!:string;
  @ApiProperty({example:'10000.00'}) @IsDecimal() installmentAmount!:string;
  @ApiProperty({example:4}) @IsInt() @Min(1) installments!:number;
  @ApiProperty({example:'2026-09-01'}) @IsDateString() firstDueDate!:string;
}
