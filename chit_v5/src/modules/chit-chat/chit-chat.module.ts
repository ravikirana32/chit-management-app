import {Body,Controller,Delete,Get,Param,Post,Put,Module,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsOptional,IsString,MaxLength} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class MessageDto{
 @ApiProperty() @IsString() @MaxLength(4000) message!:string;
 @ApiProperty({required:false}) @IsOptional() @IsString() replyToMessageId?:string;
}
class SettingsDto{
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() enabled?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() membersCanPost?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() membersCanReply?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() attachmentsEnabled?:boolean;
}
@ApiTags('Chit Chat') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chits/:chitId/chat',version:'v1'})
export class ChitChatController{
 constructor(private readonly db:Sequelize){}
 async role(u:any){const [r]:any=await this.db.query(`SELECT role FROM users WHERE id=:u`,{replacements:{u:u.sub}});return r[0]?.role}
 async canAccess(chitId:string,u:any){
  const [r]:any=await this.db.query(`
   SELECT 1 FROM chits c WHERE c.id=:c AND (c.creator_id=:u OR EXISTS(
    SELECT 1 FROM chit_participants cp WHERE cp.chit_id=c.id AND cp.user_id=:u))`,{replacements:{c:chitId,u:u.sub}});
  return !!r.length;
 }
 @Get('messages') async list(@Param('chitId')c:string,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const [r]:any=await this.db.query(`SELECT * FROM chit_chat_messages WHERE chit_id=:c ORDER BY created_at DESC LIMIT 100`,{replacements:{c}});
  return {success:true,data:r};
 }
 @Post('messages') async post(@Param('chitId')c:string,@Body()d:MessageDto,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const role=await this.role(u);
  const [s]:any=await this.db.query(`SELECT * FROM chit_chat_settings WHERE chit_id=:c`,{replacements:{c}});
  const st=s[0]??{enabled:true,members_can_post:true,members_can_reply:true};
  if(!st.enabled || (role==='MEMBER' && !st.members_can_post))return {success:false,message:'Chat posting disabled'};
  if(d.replyToMessageId && role==='MEMBER' && !st.members_can_reply)return {success:false,message:'Member replies disabled'};
  const [r]:any=await this.db.query(`INSERT INTO chit_chat_messages(chit_id,sender_id,message,reply_to_message_id) VALUES(:c,:u,:m,:reply) RETURNING *`,{replacements:{c,u:u.sub,m:d.message,reply:d.replyToMessageId??null}});
  return {success:true,data:r[0]};
 }
 @Post('messages/:messageId/pin') async pin(@Param('chitId')c:string,@Param('messageId')id:string,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const role=await this.role(u);if(!['CREATOR','AGENT'].includes(role))return {success:false,message:'Not authorized'};
  const [r]:any=await this.db.query(`UPDATE chit_chat_messages SET is_pinned=NOT is_pinned WHERE id=:id AND chit_id=:c RETURNING *`,{replacements:{id,c}});
  return {success:!!r.length,data:r[0]??null};
 }
 @Delete('messages/:messageId') async del(@Param('chitId')c:string,@Param('messageId')id:string,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const role=await this.role(u);
  const [r]:any=await this.db.query(`UPDATE chit_chat_messages SET status='DELETED',deleted_at=NOW() WHERE id=:id AND chit_id=:c AND (sender_id=:u OR :role IN ('CREATOR','AGENT')) RETURNING *`,{replacements:{id,c,u:u.sub,role}});
  return {success:!!r.length,data:r[0]??null};
 }
 @Put('settings') async settings(@Param('chitId')c:string,@Body()d:SettingsDto,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const role=await this.role(u);if(role!=='CREATOR')return {success:false,message:'Only creator can change chat settings'};
  const [r]:any=await this.db.query(`
   INSERT INTO chit_chat_settings(chit_id,enabled,members_can_post,members_can_reply,attachments_enabled,updated_by,updated_at)
   VALUES(:c,COALESCE(:enabled,true),COALESCE(:post,true),COALESCE(:reply,true),COALESCE(:att,true),:u,NOW())
   ON CONFLICT(chit_id) DO UPDATE SET enabled=COALESCE(:enabled,chit_chat_settings.enabled),members_can_post=COALESCE(:post,chit_chat_settings.members_can_post),members_can_reply=COALESCE(:reply,chit_chat_settings.members_can_reply),attachments_enabled=COALESCE(:att,chit_chat_settings.attachments_enabled),updated_by=:u,updated_at=NOW()
   RETURNING *`,{replacements:{c,enabled:d.enabled??null,post:d.membersCanPost??null,reply:d.membersCanReply??null,att:d.attachmentsEnabled??null,u:u.sub}});
  return {success:true,data:r[0]};
 }
 @Post('read') async read(@Param('chitId')c:string,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const [r]:any=await this.db.query(`
   INSERT INTO chit_chat_reads(chit_id,user_id,last_read_at) VALUES(:c,:u,NOW())
   ON CONFLICT(chit_id,user_id) DO UPDATE SET last_read_at=NOW() RETURNING *`,{replacements:{c,u:u.sub}});
  return {success:true,data:r[0]};
 }
}
@Module({controllers:[ChitChatController]}) export class ChitChatModule{}
