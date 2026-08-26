import {Body,Controller,Get,Module,Put,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsBoolean,IsOptional,IsString,Matches} from 'class-validator';
import {Sequelize} from 'sequelize-typescript';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {CurrentUser} from '../auth/current-user.decorator';

class NotificationPreferenceDto{
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() paymentReminders?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() auctionAlerts?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() winnerAlerts?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() payoutAlerts?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() overdueAlerts?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() memberUpdates?:boolean;
 @ApiProperty({required:false}) @IsOptional() @IsBoolean() pushEnabled?:boolean;
 @ApiProperty({required:false,example:'22:00'}) @IsOptional() @IsString() @Matches(/^([01]\\d|2[0-3]):[0-5]\\d$/) quietStart?:string;
 @ApiProperty({required:false,example:'07:00'}) @IsOptional() @IsString() @Matches(/^([01]\\d|2[0-3]):[0-5]\\d$/) quietEnd?:string;
}

@ApiTags('Notifications') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'notifications',version:'v1'})
class NotificationsController{
 constructor(private readonly db:Sequelize){}
 @Get('preferences')
 async get(@CurrentUser()u:any){
  const [r]:any=await this.db.query(`SELECT * FROM notification_preferences WHERE user_id=:u`,{replacements:{u:u.sub}});
  return {success:true,data:r[0]??{user_id:u.sub,push_enabled:true}};
 }
 @Put('preferences')
 async put(@Body()d:NotificationPreferenceDto,@CurrentUser()u:any){
  const [r]:any=await this.db.query(
   `INSERT INTO notification_preferences(user_id,payment_reminders,auction_alerts,winner_alerts,payout_alerts,overdue_alerts,member_updates,push_enabled,quiet_start,quiet_end,created_at,updated_at)
    VALUES(:u,COALESCE(:payment,true),COALESCE(:auction,true),COALESCE(:winner,true),COALESCE(:payout,true),COALESCE(:overdue,true),COALESCE(:member,true),COALESCE(:push,true),:qs,:qe,NOW(),NOW())
    ON CONFLICT(user_id) DO UPDATE SET payment_reminders=COALESCE(:payment,notification_preferences.payment_reminders),
     auction_alerts=COALESCE(:auction,notification_preferences.auction_alerts),
     winner_alerts=COALESCE(:winner,notification_preferences.winner_alerts),
     payout_alerts=COALESCE(:payout,notification_preferences.payout_alerts),
     overdue_alerts=COALESCE(:overdue,notification_preferences.overdue_alerts),
     member_updates=COALESCE(:member,notification_preferences.member_updates),
     push_enabled=COALESCE(:push,notification_preferences.push_enabled),
     quiet_start=:qs,quiet_end=:qe,updated_at=NOW() RETURNING *`,
   {replacements:{u:u.sub,payment:d.paymentReminders,auction:d.auctionAlerts,winner:d.winnerAlerts,payout:d.payoutAlerts,overdue:d.overdueAlerts,member:d.memberUpdates,push:d.pushEnabled,qs:d.quietStart??null,qe:d.quietEnd??null}});
  return {success:true,data:r[0]};
 }
}
@Module({controllers:[NotificationsController]}) export class NotificationsModule{}
