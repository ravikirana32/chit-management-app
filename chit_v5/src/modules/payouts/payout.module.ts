import { Body, Controller, Get, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayoutService } from './payout.service';
import { SettlePayoutDto } from './dto/settle-payout.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Payouts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'payouts',version:'v1'})
class PayoutController {
  constructor(private readonly service:PayoutService){}

  @Get('chits/:chitId')
  @ApiOperation({summary:'List payouts for a chit'})
  list(@Param('chitId') chitId:string,@CurrentUser() user:any){
    return this.service.list(chitId,user.sub);
  }

  @Post(':payoutId/settle')
  @ApiOperation({summary:'Settle or fail a payout'})
  settle(@Param('payoutId') payoutId:string,@Body() dto:SettlePayoutDto,@CurrentUser() user:any){
    return this.service.settle(payoutId,user.sub,dto);
  }
}
@Module({controllers:[PayoutController],providers:[PayoutService],exports:[PayoutService]})
export class PayoutModule {}
