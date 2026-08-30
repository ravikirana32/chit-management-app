import { Body, Controller, Get, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FixedDrawService } from './fixed-draw.service';
import { FixedDrawFundedLaterService } from './fixed-draw-funded-later.service';
import { StartDrawDto } from './dto/start-draw.dto';
import { DrawInterestDto } from './dto/draw-interest.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Draws')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'draws', version: 'v1' })
class DrawsController {
  constructor(private readonly service: FixedDrawService) {}

  @Post('chits/:chitId/start')
  @ApiOperation({ summary: 'Open a FIXED_DRAW month interest window. Does not select a winner.' })
  start(
    @Param('chitId') chitId: string,
    @Body() dto: StartDrawDto,
    @CurrentUser() user: any,
  ) {
    return this.service.startDraw(chitId, dto, user.sub);
  }

  @Post('chits/:chitId/months/:monthId/interest')
  @ApiOperation({ summary: 'Member expresses interest in the FIXED_DRAW month' })
  interest(
    @Param('chitId') chitId: string,
    @Param('monthId') monthId: string,
    @Body() dto: DrawInterestDto,
    @CurrentUser() user: any,
  ) {
    return this.service.setInterest(chitId, monthId, user.sub, dto.interested);
  }

  @Get('chits/:chitId/months/:monthId')
  @ApiOperation({ summary: 'Get draw state, eligible members, interest responses and winner' })
  get(
    @Param('chitId') chitId: string,
    @Param('monthId') monthId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getDraw(chitId, monthId, user.sub);
  }

  @Post('chits/:chitId/months/:monthId/run')
  @ApiOperation({ summary: 'Agent executes the FIXED_DRAW after the interest window; payout settlement is deferred until collections are verified.' })
  run(
    @Param('chitId') chitId: string,
    @Param('monthId') monthId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.runDraw(chitId, monthId, user.sub);
  }

  @Post('chits/:chitId/months/:monthId/agent-payout')
  @ApiOperation({ summary: 'Settle an AGENT_CHIT month. No draw; every member still contributes; configured agent receives the month payout.' })
  agentPayout(
    @Param('chitId') chitId: string,
    @Param('monthId') monthId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.runAgentChit(chitId, monthId, user.sub);
  }
}

@Module({
  controllers: [DrawsController],
  providers: [
    FixedDrawFundedLaterService,
    { provide: FixedDrawService, useExisting: FixedDrawFundedLaterService },
  ],
  exports: [FixedDrawService],
})
export class DrawsModule {}
