import {Controller,Get,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

@ApiTags('Agent Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'agents/me/dashboard',version:'1'})
export class AgentDashboardController {
 constructor(private readonly db:Sequelize){}

 @Get()
 @ApiOperation({summary:'Get complete agent portfolio dashboard'})
 async dashboard(@CurrentUser()u:any){
  const [summary]:any=await this.db.query(`
   SELECT
     COUNT(DISTINCT a.chit_id)::int AS active_chits,
     COUNT(DISTINCT cp.user_id)::int AS members,
     COUNT(DISTINCT CASE WHEN c.status='ACTIVE' THEN c.id END)::int AS live_chits,
     COUNT(DISTINCT CASE WHEN c.status='COMPLETED' THEN c.id END)::int AS completed_chits
   FROM chit_agent_assignments a
   JOIN chits c ON c.id=a.chit_id
   LEFT JOIN chit_participants cp ON cp.chit_id=c.id
   WHERE a.agent_id=:u AND a.active=true
  `,{replacements:{u:u.sub}});

  const [chits]:any=await this.db.query(`
   SELECT
     c.id,c.name,c.status,c.created_at,
     a.can_view_members,a.can_collect_cash,a.can_verify_payments,
     a.can_manage_chat,a.can_run_draw,a.can_run_auction,a.can_manage_chit,
     COUNT(DISTINCT cp.user_id)::int AS member_count
   FROM chit_agent_assignments a
   JOIN chits c ON c.id=a.chit_id
   LEFT JOIN chit_participants cp ON cp.chit_id=c.id
   WHERE a.agent_id=:u AND a.active=true
   GROUP BY c.id,a.id
   ORDER BY c.created_at DESC
  `,{replacements:{u:u.sub}});

  return {
   success:true,
   data:{
    summary:summary[0]??{
     active_chits:0,members:0,live_chits:0,completed_chits:0
    },
    chits
   }
  };
 }
}
