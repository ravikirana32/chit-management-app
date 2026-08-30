import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class DrawInterestDto {
  @ApiProperty({example:true,description:'true = interested in this fixed draw; false = not interested'})
  @IsBoolean()
  interested!:boolean;
}
