import { Body, Controller, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FixedDrawService } from './fixed-draw.service';
import { StartDrawDto } from './dto/start-draw.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Draws') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'draws',version:'v1'})
class DrawsController {
  constructor(private readonly service:FixedDrawService){}
  @Post('chits/:chitId/start') @ApiOperation({summary:'Execute Fixed Draw for a chit month'})
  start(@Param('chitId') chitId:string,@Body() dto:StartDrawDto,@CurrentUser() user:any){return this.service.startDraw(chitId,dto.chitMonthId,user.sub);}
}
@Module({controllers:[DrawsController],providers:[FixedDrawService],exports:[FixedDrawService]}) export class DrawsModule{}
