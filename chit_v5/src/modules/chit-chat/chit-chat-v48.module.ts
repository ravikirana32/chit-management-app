import {Body,Controller,Get,Param,Post,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsString,MaxLength} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class ReportDto{
 @ApiProperty() @IsString() @MaxLength(1000) reason!:string;
}
@ApiTags('Chit Chat v48') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chits/:chitId/chat',version:'v1'})
export class ChitChatV48Controller{
 constructor(private readonly db:Sequelize){}
 @Post('messages/:messageId/report') @ApiOperation({summary:'Report a chit chat message'})
 async report(@Param('chitId')c:string,@Param('messageId')m:string,@Body()d:ReportDto,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`
   INSERT INTO chit_chat_reports(message_id,reported_by,reason)
   SELECT :m,:u,:reason WHERE EXISTS(SELECT 1 FROM chit_chat_messages WHERE id=:m AND chit_id=:c)
   RETURNING *`,{replacements:{c,m,u:u.sub,reason:d.reason}});
  return {success:!!r.length,data:r[0]??null};
 }
 @Get('notifications') async notifications(@Param('chitId')c:string,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`
   SELECT * FROM notification_events
   WHERE user_id=:u AND (chit_id=:c OR chit_id IS NULL)
   ORDER BY created_at DESC LIMIT 50`,{replacements:{c,u:u.sub}});
  return {success:true,data:r};
 }
 @Post('notifications/:notificationId/read') async read(@Param('notificationId')id:string,@CurrentUser()u:any){
  const [r]:any=await this.db.query(`UPDATE notification_events SET read_at=COALESCE(read_at,NOW()) WHERE id=:id AND user_id=:u RETURNING *`,{replacements:{id,u:u.sub}});
  return {success:!!r.length,data:r[0]??null};
 }
}
