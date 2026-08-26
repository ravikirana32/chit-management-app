import {Body,Controller,Get,Param,Post,Query,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsIn,IsString,MaxLength} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class MessageV49Dto{
 @ApiProperty() @IsString() @MaxLength(4000) message!:string;
 @ApiProperty({required:false}) @IsString() @MaxLength(100) clientMessageId?:string;
}
class PushTokenDto{
 @ApiProperty({enum:['ANDROID','IOS']}) @IsIn(['ANDROID','IOS']) platform!:string;
 @ApiProperty() @IsString() @MaxLength(500) token!:string;
}
@ApiTags('v49 Hardening') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chits/:chitId/chat',version:'v1'})
export class ChitChatHardeningController{
 constructor(private readonly db:Sequelize){}
 async canAccess(c:string,u:any){const [r]:any=await this.db.query(`SELECT 1 FROM chits x WHERE x.id=:c AND (x.creator_id=:u OR EXISTS(SELECT 1 FROM chit_participants p WHERE p.chit_id=x.id AND p.user_id=:u))`,{replacements:{c,u:u.sub}});return !!r.length}
 @Get('messages/page') @ApiOperation({summary:'Paginated chat history'})
 async page(@Param('chitId')c:string,@Query('before')before:string|undefined,@Query('limit')limit:string|undefined,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const n=Math.min(Math.max(Number(limit||30),1),100);
  const [r]:any=await this.db.query(`
   SELECT * FROM chit_chat_messages
   WHERE chit_id=:c AND (:before IS NULL OR created_at<:before::timestamp)
   ORDER BY created_at DESC LIMIT :n`,{replacements:{c,before:before||null,n}});
  return {success:true,data:r,nextBefore:r.length?r[r.length-1].created_at:null};
 }
 @Post('messages/idempotent') async message(@Param('chitId')c:string,@Body()d:MessageV49Dto,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const [r]:any=await this.db.query(`
   INSERT INTO chit_chat_messages(chit_id,sender_id,message,client_message_id)
   VALUES(:c,:u,:m,:client)
   ON CONFLICT(chit_id,sender_id,client_message_id) DO UPDATE SET message=chit_chat_messages.message
   RETURNING *`,{replacements:{c,u:u.sub,m:d.message,client:d.clientMessageId||null}});
  return {success:true,data:r[0]};
 }
 @Post('presence') async presence(@Param('chitId')c:string,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const [r]:any=await this.db.query(`
   INSERT INTO chat_user_presence(chit_id,user_id,last_seen_at) VALUES(:c,:u,NOW())
   ON CONFLICT(chit_id,user_id) DO UPDATE SET last_seen_at=NOW()
   RETURNING *`,{replacements:{c,u:u.sub}});
  return {success:true,data:r[0]};
 }
 @Post('push-token') async push(@Param('chitId')c:string,@Body()d:PushTokenDto,@CurrentUser()u:any){
  if(!await this.canAccess(c,u))return {success:false,message:'Not authorized'};
  const [r]:any=await this.db.query(`
   INSERT INTO device_push_tokens(user_id,platform,token,enabled,updated_at) VALUES(:u,:p,:t,true,NOW())
   ON CONFLICT(user_id,platform,token) DO UPDATE SET enabled=true,updated_at=NOW()
   RETURNING id,user_id,platform,enabled`,{replacements:{u:u.sub,p:d.platform,t:d.token}});
  return {success:true,data:r[0]};
 }
}
