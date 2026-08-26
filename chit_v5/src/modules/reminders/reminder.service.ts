import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class ReminderService {
  constructor(private readonly sequelize:Sequelize){}

  async createForOutstanding() {
    const [rows]:any=await this.sequelize.query(
      `SELECT o.id,o.chit_participant_id,o.outstanding_amount,m.chit_id,m.month_number,
              m.scheduled_date,u.id AS user_id
       FROM contribution_obligations o
       JOIN chit_months m ON m.id=o.chit_month_id
       JOIN chit_participants cp ON cp.id=o.chit_participant_id
       JOIN users u ON u.id=cp.user_id
       WHERE o.outstanding_amount>0
         AND o.status IN ('DUE','PARTIAL','OVERDUE')
         AND m.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'`,
    );

    let created=0;
    for(const row of rows) {
      const [existing]:any=await this.sequelize.query(
        `SELECT id FROM notifications
         WHERE user_id=:userId
           AND type='PAYMENT_REMINDER'
           AND data->>'obligationId'=:obligationId
           AND created_at::date=CURRENT_DATE
         LIMIT 1`,
        {replacements:{userId:row.user_id,obligationId:row.id}});
      if(existing.length) continue;

      await this.sequelize.query(
        `INSERT INTO notifications
         (id,user_id,type,title,body,data,status,created_at,updated_at)
         VALUES(gen_random_uuid(),:userId,'PAYMENT_REMINDER',
                'Chit payment reminder',
                :body,:data,'UNREAD',NOW(),NOW())`,
        {replacements:{
          userId:row.user_id,
          body:`₹${Number(row.outstanding_amount).toFixed(2)} is outstanding for Chit month ${row.month_number}.`,
          data:JSON.stringify({
            chitId:row.chit_id,
            obligationId:row.id,
            monthNumber:row.month_number,
            outstandingAmount:row.outstanding_amount
          })
        }});
      created++;
    }
    return {created};
  }
}
