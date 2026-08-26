import {Body,Controller,Delete,Get,Param,Post,Put,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsOptional,IsString} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class AssignmentDto {
 @ApiProperty() @IsString() agentId!:string;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() canViewMembers?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() canCollectCash?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() canVerifyPayments?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() canManageChat?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() canRunDraw?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() canRunAuction?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() canManageChit?:boolean;
}

@ApiTags('Agent Management') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chits',version:'v1'})
export class AgentManagementController {
 constructor(private readonly db:Sequelize){}
 async isCreator(chitId:string,userId:string){
  const [r]:any=await this.db.query(`SELECT 1 FROM chits WHERE id=:c AND creator_id=:u`,{replacements:{c:chitId,u:userId}});
  return !!r.length;
 }
 @Get('my/agent-chits') @ApiOperation({summary:'List all active chits assigned to the current agent'})
 async myChits(@CurrentUser()u:any){
  const [r]:any=await this.db.query(`
   SELECT c.*,a.id AS assignment_id,a.can_view_members,a.can_collect_cash,a.can_verify_payments,
          a.can_manage_chat,a.can_run_draw,a.can_run_auction,a.can_manage_chit
   FROM chit_agent_assignments a
   JOIN chits c ON c.id=a.chit_id
   WHERE a.agent_id=:u AND a.active=true
   ORDER BY c.created_at DESC`,{replacements:{u:u.sub}});
  return {success:true,data:r};
 }
 @Post(':chitId/agents') @ApiOperation({summary:'Assign an agent to a chit'})
 async assign(@Param('chitId')c:string,@Body()d:AssignmentDto,@CurrentUser()u:any){
  if(!await this.isCreator(c,u.sub))return {success:false,message:'Only the chit creator can assign agents'};
  const [r]:any=await this.db.query(`
   INSERT INTO chit_agent_assignments(
    chit_id,agent_id,can_view_members,can_collect_cash,can_verify_payments,
    can_manage_chat,can_run_draw,can_run_auction,can_manage_chit,assigned_by)
   VALUES(:c,:a,COALESCE(:vm,true),COALESCE(:cc,true),COALESCE(:vp,true),
          COALESCE(:chat,true),COALESCE(:draw,false),COALESCE(:auction,false),
          COALESCE(:manage,false),:u)
   ON CONFLICT(chit_id,agent_id) DO UPDATE SET
    can_view_members=EXCLUDED.can_view_members,
    can_collect_cash=EXCLUDED.can_collect_cash,
    can_verify_payments=EXCLUDED.can_verify_payments,
    can_manage_chat=EXCLUDED.can_manage_chat,
    can_run_draw=EXCLUDED.can_run_draw,
    can_run_auction=EXCLUDED.can_run_auction,
    can_manage_chit=EXCLUDED.can_manage_chit,
    active=true
   RETURNING *`,{replacements:{c,a:d.agentId,vm:d.canViewMembers,cc:d.canCollectCash,vp:d.canVerifyPayments,chat:d.canManageChat,draw:d.canRunDraw,auction:d.canRunAuction,manage:d.canManageChit,u:u.sub}});
  return {success:true,data:r[0]};
 }
 @Put(':chitId/agents/:agentId') async update(@Param('chitId')c:string,@Param('agentId')a:string,@Body()d:AssignmentDto,@CurrentUser()u:any){
  if(!await this.isCreator(c,u.sub))return {success:false,message:'Only the chit creator can update agents'};
  const [r]:any=await this.db.query(`
   UPDATE chit_agent_assignments SET
   can_view_members=COALESCE(:vm,can_view_members),can_collect_cash=COALESCE(:cc,can_collect_cash),
   can_verify_payments=COALESCE(:vp,can_verify_payments),can_manage_chat=COALESCE(:chat,can_manage_chat),
   can_run_draw=COALESCE(:draw,can_run_draw),can_run_auction=COALESCE(:auction,can_run_auction),
   can_manage_chit=COALESCE(:manage,can_manage_chit)
   WHERE chit_id=:c AND agent_id=:a RETURNING *`,
   {replacements:{c,a,vm:d.canViewMembers,cc:d.canCollectCash,vp:d.canVerifyPayments,chat:d.canManageChat,draw:d.canRunDraw,auction:d.canRunAuction,manage:d.canManageChit}});
  return {success:!!r.length,data:r[0]??null};
 }
 @Delete(':chitId/agents/:agentId') async remove(@Param('chitId')c:string,@Param('agentId')a:string,@CurrentUser()u:any){
  if(!await this.isCreator(c,u.sub))return {success:false,message:'Only the chit creator can remove agents'};
  const [r]:any=await this.db.query(`UPDATE chit_agent_assignments SET active=false WHERE chit_id=:c AND agent_id=:a RETURNING *`,{replacements:{c,a}});
  return {success:!!r.length,data:r[0]??null};
 }
}
