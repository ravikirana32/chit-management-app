import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class ChitRulesService {
  constructor(private readonly sequelize: Sequelize) {}

  async update(chitId:string,userId:string,graceDays:number,commissionMode:string) {
    if(graceDays<0 || graceDays>90) throw new BadRequestException('Grace period must be 0-90 days');
    if(!['FIXED','PER_AGENT_MONTH','NONE'].includes(commissionMode))
      throw new BadRequestException('Invalid agent commission mode');

    return this.sequelize.transaction(async transaction=>{
      const [rows]:any=await this.sequelize.query(
        `SELECT id,status FROM chits WHERE id=:chitId AND creator_id=:userId FOR UPDATE`,
        {replacements:{chitId,userId},transaction});
      if(!rows.length) throw new NotFoundException('Chit not found');
      if(['ACTIVE','COMPLETED'].includes(rows[0].status))
        throw new ConflictException('Financial rules cannot be changed after the chit is active');

      const [updated]:any=await this.sequelize.query(
        `UPDATE chits SET collection_grace_days=:graceDays,
         agent_commission_mode=:commissionMode,updated_at=NOW()
         WHERE id=:chitId RETURNING *`,
        {replacements:{chitId,graceDays,commissionMode},transaction});
      return updated[0];
    });
  }
}
