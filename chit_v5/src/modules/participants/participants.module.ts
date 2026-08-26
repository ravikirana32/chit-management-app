import {Body,Controller,Get,Module,Param,Post,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {IsString,Length} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';
class InviteDto{@IsString() @Length(10,20) mobile!:string}
@ApiTags('Participants') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chits/:chitId/participants',version:'v1'})
class ParticipantsController{
 constructor(private readonly db:Sequelize){}
 @Get() async list(@Param('chitId')chitId:string,@CurrentUser()user:any){
  const [access]:any=await this.db.query(`SELECT id FROM chits WHERE id=:chitId AND creator_id=:user`,{replacements:{chitId,user:user.sub}});
  if(!access.length)throw new Error('Only creator can list participants');
  const [rows]:any=await this.db.query(`SELECT cp.*,u.name,u.mobile_number AS mobile FROM chit_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.chit_id=:chitId ORDER BY cp.participant_sequence`,{replacements:{chitId}});
  return {success:true,data:rows};
 }
 @Post('invite') @ApiOperation({summary:'Invite an existing user by mobile'})
 async invite(@Param('chitId')chitId:string,@Body()dto:InviteDto,@CurrentUser()user:any){
  const [access]:any=await this.db.query(`SELECT * FROM chits WHERE id=:chitId AND creator_id=:user`,{replacements:{chitId,user:user.sub}});
  if(!access.length)throw new Error('Only creator can invite');
  const [u]:any=await this.db.query(`SELECT id FROM users WHERE normalized_mobile=:mobile OR mobile_number=:mobile LIMIT 1`,{replacements:{mobile:dto.mobile}});
  if(!u.length)throw new Error('Member must register before invitation');
  const [count]:any=await this.db.query(`SELECT COUNT(*)::int AS n FROM chit_participants WHERE chit_id=:chitId`,{replacements:{chitId}});
  if(count[0].n>=access[0].total_members)throw new Error('Chit member capacity reached');
  const [seq]:any=await this.db.query(`SELECT COALESCE(MAX(participant_sequence),0)+1 AS n FROM chit_participants WHERE chit_id=:chitId`,{replacements:{chitId}});
  const [rows]:any=await this.db.query(
   `INSERT INTO chit_participants(id,chit_id,user_id,participation_role,status,participant_sequence,created_at,updated_at)
    VALUES(gen_random_uuid(),:chitId,:user,'PARTICIPANT','INVITED',:seq,NOW(),NOW())
    ON CONFLICT(chit_id,user_id) DO UPDATE SET status='INVITED',updated_at=NOW()
    RETURNING *`,{replacements:{chitId,user:u[0].id,seq:seq[0].n}});
  return {success:true,data:rows[0]};
 }
}
@Module({controllers:[ParticipantsController]}) export class ParticipantsModule{}
