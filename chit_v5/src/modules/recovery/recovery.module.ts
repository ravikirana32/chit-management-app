import { Body, Controller, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecoveryService } from './recovery.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Recovery')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'recovery',version:'1'})
class RecoveryController {
  constructor(private readonly service:RecoveryService){}
  @Post('chits/:chitId/plans')
  @ApiOperation({summary:'Create a recovery/payment plan for an outstanding obligation'})
  create(@Param('chitId') chitId:string,@Body() dto:CreatePlanDto,@CurrentUser() user:any){
    return this.service.createPlan(chitId,user.sub,dto);
  }
}
@Module({controllers:[RecoveryController],providers:[RecoveryService],exports:[RecoveryService]})
export class RecoveryModule {}
