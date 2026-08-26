import { Body, Controller, Module, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuctionDistributionService } from './auction-distribution.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class DistributionDto {
  @ApiProperty({enum:['EQUAL_MEMBER_BENEFIT','REDUCE_CONTRIBUTION','CREATOR_REVENUE']})
  @IsString() mode!:string;
}
@ApiTags('Auction Rules')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'auction-rules',version:'v1'})
class AuctionDistributionController {
  constructor(private readonly service:AuctionDistributionService){}
  @Put('chits/:chitId/discount-distribution')
  update(@Param('chitId') chitId:string,@Body() dto:DistributionDto,@CurrentUser() user:any){
    return this.service.update(chitId,user.sub,dto.mode);
  }
}
@Module({controllers:[AuctionDistributionController],providers:[AuctionDistributionService],exports:[AuctionDistributionService]})
export class AuctionDistributionModule {}
