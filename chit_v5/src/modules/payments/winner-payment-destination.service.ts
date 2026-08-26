import {Injectable,NotFoundException} from '@nestjs/common';
import {Sequelize} from 'sequelize-typescript';

@Injectable()
export class WinnerPaymentDestinationService{
 constructor(private readonly db:Sequelize){}
 async snapshot(winnerUserId:string,paymentId:string,transaction?:any){
  const [p]:any=await this.db.query(`SELECT upi_id,upi_name FROM member_payment_profiles WHERE user_id=:u`,{replacements:{u:winnerUserId},transaction});
  if(!p.length)throw new NotFoundException('Winner payment profile not configured');
  await this.db.query(`UPDATE payments SET winner_upi_snapshot=:upi,winner_upi_name_snapshot=:name WHERE id=:id`,
   {replacements:{upi:p[0].upi_id,name:p[0].upi_name,id:paymentId},transaction});
  return p[0];
 }
}
