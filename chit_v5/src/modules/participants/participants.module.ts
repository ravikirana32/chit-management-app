import{Body,Controller,Delete,Get,Module,Param,Post,UseGuards,ConflictException,ForbiddenException,NotFoundException}from'@nestjs/common';import{ApiBearerAuth,ApiOperation,ApiTags}from'@nestjs/swagger';import{IsString,Length}from'class-validator';import{Sequelize}from'sequelize-typescript';import{JwtAuthGuard}from'../auth/jwt-auth.guard';import{CurrentUser}from'../auth/current-user.decorator';
class InviteDto{@IsString() @Length(10,20) mobile!:string}
@ApiTags('Participants') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chits/:chitId/participants',version:'1'})
class ParticipantsController{
 constructor(private readonly db:Sequelize){}
 @Get() async list(@Param('chitId')chitId:string,@CurrentUser()user:any){
  const [access]:any=await this.db.query(`SELECT c.id FROM chits c LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:user WHERE c.id=:chitId AND (c.creator_id=:user OR ca.can_view_members=true) LIMIT 1`,{replacements:{chitId,user:user.sub}});
  if(!access.length)throw new Error('Member-view permission is required for this chit');
  const [rows]:any=await this.db.query(`SELECT cp.*,u.name,u.mobile_number AS mobile FROM chit_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.chit_id=:chitId ORDER BY cp.participant_sequence`,{replacements:{chitId}});
  return {success:true,data:rows};
 }
 @Delete(':participantId') @ApiOperation({summary:'Remove an invited/pre-start member while preserving financial history'})
 async remove(@Param('chitId')chitId:string,@Param('participantId')participantId:string,@CurrentUser()user:any){
  return this.db.transaction(async transaction=>{
   const [r]:any=await this.db.query(`SELECT cp.*,c.status AS chit_status FROM chit_participants cp JOIN chits c ON c.id=cp.chit_id WHERE cp.id=:participantId AND cp.chit_id=:chitId FOR UPDATE`,{replacements:{chitId,participantId},transaction});
   if(!r.length)throw new NotFoundException('Participant not found');
   if(['ACTIVE','RUNNING','COMPLETED'].includes(String(r[0].chit_status).toUpperCase()))throw new ConflictException('Members cannot be removed after the chit has started');
   const [a]:any=await this.db.query(`SELECT 1 FROM chits c LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.user_id=:user AND ag.status='ACTIVE' WHERE c.id=:chitId AND (c.creator_id=:user OR ca.can_manage_chit=true OR EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=:user AND ur.role='ADMIN')) LIMIT 1`,{replacements:{chitId,user:user.sub},transaction});
   if(!a.length)throw new ForbiddenException('Member management permission is required for this chit');
   const [u]:any=await this.db.query(`UPDATE chit_participants SET status='EXITED',exited_at=COALESCE(exited_at,NOW()),updated_at=NOW() WHERE id=:participantId AND chit_id=:chitId RETURNING *`,{replacements:{participantId,chitId},transaction});
   return {success:true,data:u[0]};
  });
 }
 @Post('invite') @ApiOperation({summary:'Invite an existing user by mobile'})
 async invite(@Param('chitId')chitId:string,@Body()dto:InviteDto,@CurrentUser()user:any){
  const [access]:any=await this.db.query(`SELECT c.* FROM chits c LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:user WHERE c.id=:chitId AND (c.creator_id=:user OR ca.can_invite_members=true) LIMIT 1`,{replacements:{chitId,user:user.sub}});
  if(!access.length)throw new Error('Member invitation permission is required for this chit');
  const [u]:any=await this.db.query(`SELECT id FROM users WHERE normalized_mobile=:mobile OR mobile_number=:mobile LIMIT 1`,{replacements:{mobile:dto.mobile}});
  if(!u.length)throw new Error('Member must register before invitation');
  const [count]:any=await this.db.query(`SELECT COUNT(*)::int AS n FROM chit_participants WHERE chit_id=:chitId`,{replacements:{chitId}});
  if(count[0].n>=access[0].total_members)throw new Error('Chit member capacity reached');
  const [seq]:any=await this.db.query(`SELECT COALESCE(MAX(participant_sequence),0)+1 AS n FROM chit_participants WHERE chit_id=:chitId`,{replacements:{chitId}});
  const [rows]:any=await this.db.query(`INSERT INTO chit_participants(id,chit_id,user_id,participation_role,status,participant_sequence,created_at,updated_at) VALUES(gen_random_uuid(),:chitId,:user,'PARTICIPANT','INVITED',:seq,NOW(),NOW()) ON CONFLICT(chit_id,user_id) DO UPDATE SET status='INVITED',updated_at=NOW() RETURNING *`,{replacements:{chitId,user:u[0].id,seq:seq[0].n}});
  return {success:true,data:rows[0]};
 }
}
@Module({controllers:[ParticipantsController]}) export class ParticipantsModule{}
