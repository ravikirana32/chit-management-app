import { Controller, Get, Module, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'dashboard',version:'1'})
class DashboardController {
  constructor(private readonly service:DashboardService){}
  @Get('me')
  @ApiOperation({summary:'Member dashboard across all participating chits'})
  me(@CurrentUser() user:any){ return this.service.member(user.sub); }

  @Get('chits/:chitId')
  @ApiOperation({summary:'Creator dashboard for a chit'})
  chit(@Param('chitId') chitId:string,@CurrentUser() user:any){
    return this.service.creator(chitId,user.sub);
  }
}
@Module({controllers:[DashboardController],providers:[DashboardService],exports:[DashboardService]})
export class DashboardModule {}
