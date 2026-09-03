import { Body, Controller, Get, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuctionService } from './auction.service';
import { AuctionStateService } from './auction-state.service';
import { AuctionGateway } from './auction.gateway';
import { AuctionAutoCloseService } from './auction-auto-close.service';
import { OpenAuctionDto } from './dto/open-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { ReopenAuctionDto } from './dto/reopen-auction.dto';
import { AdditionalAuctionDto } from './dto/additional-auction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Auctions') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'auctions',version:'1'})
class AuctionsController {
 constructor(private readonly service:AuctionService,private readonly auctionState:AuctionStateService){}
 @Post('chits/:chitId/open') @ApiOperation({summary:'Open a scheduled monthly auction on its scheduled date'})
 open(@Param('chitId')chitId:string,@Body()dto:OpenAuctionDto,@CurrentUser()user:any){return this.service.open(chitId,dto.chitMonthId,user.sub,dto.durationMinutes)}
 @Post('chits/:chitId/additional/open') @ApiOperation({summary:'Open an additional auction when accumulated chit savings reach the chit total amount'})
 openAdditional(@Param('chitId')chitId:string,@Body()dto:AdditionalAuctionDto,@CurrentUser()user:any){return this.service.openAdditional(chitId,user.sub,dto.durationMinutes)}
 @Post(':auctionId/close') @ApiOperation({summary:'Close an open auction early'})
 close(@Param('auctionId')auctionId:string,@CurrentUser()user:any){return this.service.close(auctionId,user.sub)}
 @Post(':auctionId/reopen') @ApiOperation({summary:'Reopen an early-closed auction within its original date/time window'})
 reopen(@Param('auctionId')auctionId:string,@Body()dto:ReopenAuctionDto,@CurrentUser()user:any){return this.service.reopen(auctionId,user.sub,dto.durationMinutes)}
 @Post(':auctionId/bids') @ApiOperation({summary:'Place a bid during the auction window'})
 bid(@Param('auctionId')auctionId:string,@Body()dto:PlaceBidDto,@CurrentUser()user:any){return this.service.placeBid(auctionId,dto.participantId,user.sub,dto.bidAmount)}
 @Post(':auctionId/finalize') @ApiOperation({summary:'Finalize a closed/expired auction'})
 finalize(@Param('auctionId')auctionId:string,@CurrentUser()user:any){return this.service.finalize(auctionId,user.sub)}
 @Get('chits/:chitId/months/:monthId/current') @ApiOperation({summary:'Get the latest monthly auction for a chit/month'})
 current(@Param('chitId')chitId:string,@Param('monthId')monthId:string,@CurrentUser()user:any){return this.service.current(chitId,monthId,user.sub)}
 @Get(':auctionId/state') @ApiOperation({summary:'Get current auction state and recent bids'})
 state(@Param('auctionId')auctionId:string,@CurrentUser()user:any){return this.auctionState.getState(auctionId)}
 @Get('chits/:chitId/savings') @ApiOperation({summary:'View chit savings balance and transaction history'})
 savings(@Param('chitId')chitId:string,@CurrentUser()user:any){return this.service.getSavings(chitId,user.sub)}
}
@Module({controllers:[AuctionsController],providers:[AuctionService,AuctionStateService,AuctionGateway,AuctionAutoCloseService],exports:[AuctionService,AuctionStateService,AuctionGateway]})
export class AuctionsModule{}
