import {Controller,Get,Param,Module,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

@ApiTags('Operations') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'operations',version:'v1'})
class OperationsController{
 constructor(private readonly db:Sequelize){}
 @Get('chits/:chitId/summary')
 @ApiOperation({summary:'Creator operational dashboard summary'})
 async summary(@Param('chitId')chitId:string,@CurrentUser()u:any){
  const [c]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id AND creator_id=:u`,{replacements:{id:chitId,u:u.sub}});
  if(!c.length) return {success:false,message:'Not found'};
  const [r]:any=await this.db.query(`
   SELECT
    COUNT(*)::int AS total_members,
    COUNT(*) FILTER(WHERE status='VERIFIED')::int AS paid_obligations,
    COUNT(*) FILTER(WHERE status IN ('OVERDUE','DEFAULTED'))::int AS overdue_obligations,
    COALESCE(SUM(outstanding_amount),0) AS outstanding
   FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:id`,
   {replacements:{id:chitId}});
  const [m]:any=await this.db.query(`SELECT id,month_number,status,month_type,scheduled_amount,scheduled_date FROM chit_months WHERE chit_id=:id ORDER BY month_number`,{replacements:{id:chitId}});
  return {success:true,data:{chit:c[0],collection:r[0],months:m}};
 }
}
@Module({controllers:[OperationsController]}) export class OperationsModule{}
