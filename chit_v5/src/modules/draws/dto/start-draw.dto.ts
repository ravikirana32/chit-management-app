import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
export class StartDrawDto { @ApiProperty({example:'uuid'}) @IsUUID() chitMonthId!:string; }
