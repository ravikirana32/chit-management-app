import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class NotificationService {
  constructor(private readonly sequelize:Sequelize){}

  async create(userId:string,type:string,title:string,body:string,data:any={}) {
    const [rows]:any=await this.sequelize.query(
      `INSERT INTO notifications
       (id,user_id,type,title,body,data,status,created_at,updated_at)
       VALUES(gen_random_uuid(),:userId,:type,:title,:body,:data,'UNREAD',NOW(),NOW())
       RETURNING *`,
      {replacements:{
        userId,type,title,body,data:JSON.stringify(data)
      }},
    );
    return rows[0];
  }

  async list(userId:string,limit=50) {
    const [rows]:any=await this.sequelize.query(
      `SELECT * FROM notifications
       WHERE user_id=:userId
       ORDER BY created_at DESC
       LIMIT :limit`,
      {replacements:{userId,limit}},
    );
    return rows;
  }

  async markRead(userId:string,notificationId:string) {
    const [rows]:any=await this.sequelize.query(
      `UPDATE notifications SET status='READ',read_at=NOW(),updated_at=NOW()
       WHERE id=:notificationId AND user_id=:userId
       RETURNING *`,
      {replacements:{userId,notificationId}},
    );
    return rows[0] ?? null;
  }
}
