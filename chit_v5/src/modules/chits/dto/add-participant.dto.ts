import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ParticipationRole } from '../../../common/enums/chit.enums';

export class AddParticipantDto {
  @ApiPropertyOptional({ example: 'uuid-of-existing-user' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ enum: ParticipationRole, default: ParticipationRole.PARTICIPANT })
  @IsEnum(ParticipationRole)
  participationRole!: ParticipationRole;
}
