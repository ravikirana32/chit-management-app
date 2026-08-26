import {Controller,Get,Param,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

@ApiTags('Agent Dashboard UI')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({path:'agents/me',version:'v1'})
export class AgentDashboardUiController {
 constructor(private readonly db:Sequelize){}

 @Get('chits/:chitId')
 @ApiOperation({summary:'Get an agent-accessible chit summary'})
 async chit(@Param('chitId')c:string,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`
   SELECT c.id,c.name,c.status,a.*
   FROM chit_agent_assignments a
   JOIN chits c ON c.id=a.chit_id
   WHERE a.agent_id=:u AND a.chit_id=:c AND a.active=true
  `,{replacements:{u:u.sub,c}});
  if(!r.length)return {success:false,message:'Chit is not assigned to this agent'};
  return {success:true,data:r[0]};
 }
}
