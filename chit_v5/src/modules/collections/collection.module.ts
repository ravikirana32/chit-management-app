import { Controller, Get, Module, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CollectionStatusService } from './collection-status.service';
import { CollectionScheduler } from './collection.scheduler';

@ApiTags('Collections')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'collections',version:'1'})
class CollectionsController {
  constructor(private readonly sequelize:Sequelize){}

  @Get('chits/:chitId/overdue')
  @ApiOperation({summary:'List overdue/default contribution obligations'})
  async overdue(@Param('chitId') chitId:string,@CurrentUser() user:any){
    const [access]:any=await this.sequelize.query(
      `SELECT id FROM chits WHERE id=:chitId AND creator_id=:userId`,
      {replacements:{chitId,userId:user.sub}});
    if(!access.length) return {success:false,message:'Only creator can view collection exceptions'};
    const [rows]:any=await this.sequelize.query(
      `SELECT o.*,m.month_number,m.scheduled_date,cp.participant_sequence,u.name,u.mobile
       FROM contribution_obligations o
       JOIN chit_months m ON m.id=o.chit_month_id
       JOIN chit_participants cp ON cp.id=o.chit_participant_id
       JOIN users u ON u.id=cp.user_id
       WHERE m.chit_id=:chitId AND o.status IN ('OVERDUE','DEFAULTED')
       ORDER BY m.month_number,cp.participant_sequence`,
      {replacements:{chitId}});
    return rows;
  }
}

@Module({
  controllers:[CollectionsController],
  providers:[CollectionStatusService,CollectionScheduler],
  exports:[CollectionStatusService],
})
export class CollectionModule {}
