import { Body, Controller, Get, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { RecordAdjustmentDto } from './dto/record-adjustment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Ledger')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'ledger',version:'v1'})
class LedgerController {
  constructor(private readonly service:LedgerService){}

  @Get('chits/:chitId/me/:participantId')
  @ApiOperation({summary:'Get authenticated participant ledger'})
  participant(@Param('chitId') chitId:string,@Param('participantId') participantId:string,@CurrentUser() user:any){
    return this.service.getParticipantLedger(chitId,participantId,user.sub);
  }

  @Get('chits/:chitId')
  @ApiOperation({summary:'Get complete chit ledger for creator'})
  chit(@Param('chitId') chitId:string,@CurrentUser() user:any){
    return this.service.getChitLedger(chitId,user.sub);
  }

  @Post('chits/:chitId/adjustments')
  @ApiOperation({summary:'Record creator-authorized manual adjustment'})
  adjustment(@Param('chitId') chitId:string,@Body() dto:RecordAdjustmentDto,@CurrentUser() user:any){
    return this.service.recordAdjustment(chitId,user.sub,dto);
  }
}
@Module({controllers:[LedgerController],providers:[LedgerService],exports:[LedgerService]})
export class LedgerModule {}
