import { Controller, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonthCloseService } from './month-close.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Month Close')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'month-close',version:'v1'})
class MonthCloseController {
  constructor(private readonly service:MonthCloseService){}
  @Post('months/:monthId')
  @ApiOperation({summary:'Lock a fully reconciled chit month'})
  close(@Param('monthId') monthId:string,@CurrentUser() user:any){
    return this.service.close(monthId,user.sub);
  }
}
@Module({controllers:[MonthCloseController],providers:[MonthCloseService],exports:[MonthCloseService]})
export class MonthCloseModule {}
