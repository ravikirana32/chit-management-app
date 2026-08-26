import { Body, Controller, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsDecimal, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentCommissionService } from './agent-commission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class RecordCommissionDto {
  @ApiProperty() @IsUUID() agentId!:string;
  @ApiProperty({example:'5000.00'}) @IsDecimal() amount!:string;
}
@ApiTags('Agent Commission')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'agent-commission',version:'v1'})
class AgentCommissionController {
  constructor(private readonly service:AgentCommissionService){}
  @Post('chits/:chitId/months/:monthId')
  @ApiOperation({summary:'Record commission for a configured Agent Chit month'})
  record(@Param('chitId') chitId:string,@Param('monthId') monthId:string,@Body() dto:RecordCommissionDto,@CurrentUser() user:any){
    return this.service.record(chitId,monthId,dto.agentId,dto.amount,user.sub);
  }
}
@Module({controllers:[AgentCommissionController],providers:[AgentCommissionService],exports:[AgentCommissionService]})
export class AgentCommissionModule {}
