import {Body,Controller,Get,Module,Param,Post,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {FixedDrawService} from './fixed-draw.service';
import {FixedDrawFundedLaterService} from './fixed-draw-funded-later.service';
import {VerifiedFixedDrawService} from './verified-fixed-draw.service';
import {AgentPayoutRecoveryService} from './agent-payout-recovery.service';
import {MemberDrawInterestService} from './member-draw-interest.service';
import {StartDrawDto} from './dto/start-draw.dto';
import {DrawInterestDto} from './dto/draw-interest.dto';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';
import {VerifiedContributionGateService} from '../../common/verified-contribution-gate.service';

@ApiTags('Draws')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'draws',version:'1'})
class DrawsController{
 constructor(private readonly service:FixedDrawService,private readonly agentPayoutService:AgentPayoutRecoveryService,private readonly memberInterestService:MemberDrawInterestService){}
 @Post('chits/:chitId/start')
 @ApiOperation({summary:'Open a FIXED_DRAW month interest window. Does not select a winner.'})
 async start(@Param('chitId')chitId:string,@Body()dto:StartDrawDto,@CurrentUser()user:any){const result=await this.service.startDraw(chitId,dto,user.sub);await this.memberInterestService.excludeHistoricalWinners(chitId,dto.chitMonthId);return result}
 @Post('chits/:chitId/months/:monthId/interest')
 @ApiOperation({summary:'Member expresses interest in the FIXED_DRAW month; the interest window is opened automatically if needed.'})
 interest(@Param('chitId')chitId:string,@Param('monthId')monthId:string,@Body()dto:DrawInterestDto,@CurrentUser()user:any){return this.memberInterestService.setInterest(chitId,monthId,user.sub,dto.interested)}
 @Get('chits/:chitId/months/:monthId')
 async get(@Param('chitId')chitId:string,@Param('monthId')monthId:string,@CurrentUser()user:any){await this.memberInterestService.excludeHistoricalWinners(chitId,monthId);return this.service.getDraw(chitId,monthId,user.sub)}
 @Post('chits/:chitId/months/:monthId/run')
 @ApiOperation({summary:'Run the FIXED_DRAW only after every active member contribution is fully verified.'})
 run(@Param('chitId')chitId:string,@Param('monthId')monthId:string,@CurrentUser()user:any){return this.service.runDraw(chitId,monthId,user.sub)}
 @Post('chits/:chitId/months/:monthId/agent-payout')
 @ApiOperation({summary:'Create or recover an AGENT_CHIT payout. No draw; settlement is a separate audited payment step.'})
 agentPayout(@Param('chitId')chitId:string,@Param('monthId')monthId:string,@CurrentUser()user:any){return this.agentPayoutService.createOrRecover(chitId,monthId,user.sub)}
}
@Module({controllers:[DrawsController],providers:[VerifiedContributionGateService,FixedDrawFundedLaterService,VerifiedFixedDrawService,{provide:FixedDrawService,useExisting:VerifiedFixedDrawService},AgentPayoutRecoveryService,MemberDrawInterestService],exports:[FixedDrawService]})
export class DrawsModule{}
