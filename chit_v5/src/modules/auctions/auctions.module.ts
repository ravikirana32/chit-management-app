import { Controller, Get, Module, Param, UseGuards } from '@nestjs/common';
import { Body, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuctionService } from './auction.service';
import { AuctionStateService } from './auction-state.service';
import { AuctionGateway } from './auction.gateway';
import { AuctionAutoCloseService } from './auction-auto-close.service';
import { OpenAuctionDto } from './dto/open-auction.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { FinalizeAuctionDto } from './dto/finalize-auction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Auctions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'auctions', version: 'v1' })
class AuctionsController {
  constructor(
    private readonly service: AuctionService,
    private readonly state: AuctionStateService,
  ) {}

  @Post('chits/:chitId/open')
  @ApiOperation({ summary: 'Open an auction for up to 60 minutes' })
  open(
    @Param('chitId') chitId: string,
    @Body() dto: OpenAuctionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.open(chitId, dto.chitMonthId, user.sub, dto.durationMinutes);
  }

  @Post(':auctionId/bids')
  @ApiOperation({ summary: 'Place a bid during the auction window' })
  bid(
    @Param('auctionId') auctionId: string,
    @Body() dto: PlaceBidDto,
    @CurrentUser() user: any,
  ) {
    return this.service.placeBid(auctionId, dto.participantId, user.sub, dto.bidAmount);
  }

  @Post(':auctionId/finalize')
  @ApiOperation({ summary: 'Finalize a closed auction' })
  finalize(
    @Param('auctionId') auctionId: string,
    @Body() dto: FinalizeAuctionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.finalize(auctionId, user.sub);
  }

  @Get(':auctionId/state')
  @ApiOperation({ summary: 'Get current auction state and recent bids' })
  state(@Param('auctionId') auctionId: string) {
    return this.state.getState(auctionId);
  }
}

@Module({
  controllers: [AuctionsController],
  providers: [AuctionService, AuctionStateService, AuctionGateway, AuctionAutoCloseService],
  exports: [AuctionService, AuctionStateService, AuctionGateway],
})
export class AuctionsModule {}
