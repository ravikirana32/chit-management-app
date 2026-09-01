import{Controller,Get,Param,Module,UseGuards}from'@nestjs/common';import{ApiBearerAuth,ApiOperation,ApiTags}from'@nestjs/swagger';import{Sequelize}from'sequelize-typescript';import{JwtAuthGuard}from'../auth/jwt-auth.guard';import{CurrentUser}from'../auth/current-user.decorator';import{OperationSchedulePolicyService}from'../../common/enterprise-hardening/operation-schedule-policy.service';

@ApiTags('Operations') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'operations',version:'1'})
class OperationsController{
 constructor(private readonly db:Sequelize,private readonly schedulePolicy:OperationSchedulePolicyService){}
 @Get('policy')
 @ApiOperation({summary:'Get server-authoritative scheduled-operation policy for mobile UI'})
 policy(){return{success:true,data:this.schedulePolicy.policy()};}
 @Get('chits/:chitId/summary')
 @ApiOperation({summary:'Authoritative chit operational summary including current month and allowed actions'})
 async summary(@Param('chitId')chitId:string,@CurrentUser()u:any){
  const [c]:any=await this.db.query(`SELECT DISTINCT c.* FROM chits c LEFT JOIN chit_participants cp ON cp.chit_id=c.id AND cp.user_id=:u LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:u WHERE c.id=:id AND (c.creator_id=:u OR cp.id IS NOT NULL OR ag.id IS NOT NULL OR EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=:u AND ur.role='ADMIN'))`,{replacements:{id:chitId,u:u.sub}});
  if(!c.length)return{success:false,message:'Not found'};const chit=c[0];
  const [r]:any=await this.db.query(`SELECT COUNT(*)::int AS total_members,COUNT(*) FILTER(WHERE status='VERIFIED')::int AS paid_obligations,COUNT(*) FILTER(WHERE status IN ('OVERDUE','DEFAULTED'))::int AS overdue_obligations,COALESCE(SUM(outstanding_amount),0) AS outstanding FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:id`,{replacements:{id:chitId}});
  const [m]:any=await this.db.query(`SELECT id,month_number,status,month_type,scheduled_amount,scheduled_date,winner_payout_amount,agent_id,draw_interest_opens_at,draw_interest_closes_at,draw_at FROM chit_months WHERE chit_id=:id ORDER BY month_number`,{replacements:{id:chitId}});
  const current=m.find((x:any)=>!['LOCKED','COMPLETED'].includes(String(x.status).toUpperCase()))||m[m.length-1]||null;
  const [a]:any=await this.db.query(`SELECT ca.* FROM chit_agent_assignments ca JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:u WHERE ca.chit_id=:id AND ca.active=true LIMIT 1`,{replacements:{id:chitId,u:u.sub}});
  const admin=(await this.db.query(`SELECT 1 FROM user_roles WHERE user_id=:u AND role='ADMIN' LIMIT 1`,{replacements:{u:u.sub}}))[0].length>0;const creator=chit.creator_id===u.sub;const access=a[0]||{};
  return{success:true,data:{chit,collection:r[0],months:m,currentMonth:current,currentMonthId:current?.id??null,currentMonthNumber:current?.month_number??null,configurationLocked:['ACTIVE','COMPLETED','LOCKED'].includes(String(chit.status).toUpperCase()),schedulePolicy:this.schedulePolicy.policy(),capabilities:{can_view_members:admin||creator||access.can_view_members===true,can_invite_members:admin||creator||access.can_invite_members===true,can_collect_cash:admin||creator||access.can_collect_cash===true,can_verify_payments:admin||creator||access.can_verify_payments===true,can_run_draw:admin||creator||access.can_run_draw===true,can_run_auction:admin||creator||access.can_run_auction===true,can_manage_chit:admin||creator||access.can_manage_chit===true,can_view_payout:admin||creator||access.can_view_payout===true,can_settle_payout:admin||creator||access.can_settle_payout===true,can_reopen_auction:admin||creator||access.can_reopen_auction===true,can_open_additional_auction:admin||creator||access.can_open_additional_auction===true}}};
 }
}
@Module({controllers:[OperationsController]}) export class OperationsModule{}
