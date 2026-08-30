import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class AgentCommissionService {
  constructor(private readonly sequelize:Sequelize){}

  async record(chitId:string,monthId:string,agentId:string,amount:string,actor:string){
    return this.sequelize.transaction(async transaction=>{
      const [rows]:any=await this.sequelize.query(
        `SELECT m.*,c.creator_id FROM chit_months m JOIN chits c ON c.id=m.chit_id
         WHERE m.id=:monthId AND m.chit_id=:chitId FOR UPDATE`,
        {replacements:{monthId,chitId},transaction});
      if(!rows.length) throw new NotFoundException('Month not found');
      if(rows[0].creator_id!==actor) throw new ConflictException('Only creator can record commission');
      if(rows[0].month_type!=='AGENT_CHIT') throw new BadRequestException('This month is not an Agent Chit month');
      if(!rows[0].agent_id) throw new ConflictException('No configured agent for this month');

      const [agentRows]:any=await this.sequelize.query(
        `SELECT id,user_id,status FROM agents
         WHERE (id=:agentId OR user_id=:agentId)
           AND status='ACTIVE'
         LIMIT 1`,
        {replacements:{agentId},transaction});
      if(!agentRows.length) throw new NotFoundException('Agent not found');
      if(agentRows[0].id!==rows[0].agent_id)
        throw new ConflictException('Agent does not match the configured agent for this month');

      const [existing]:any=await this.sequelize.query(
        `SELECT id FROM ledger_entries WHERE chit_month_id=:monthId AND entry_type='AGENT_COMMISSION' LIMIT 1`,
        {replacements:{monthId},transaction});
      if(existing.length) throw new ConflictException('Agent commission already recorded for this month');

      const value=Number(amount);
      if(!Number.isFinite(value)||value<=0) throw new BadRequestException('Commission must be positive');

      const [entries]:any=await this.sequelize.query(
        `INSERT INTO ledger_entries
         (id,chit_id,chit_month_id,entry_type,amount,description,reference_type,reference_id,created_by,created_at,updated_at)
         VALUES(gen_random_uuid(),:chitId,:monthId,'AGENT_COMMISSION',:amount,
                'Agent commission for Agent Chit month','AGENT_COMMISSION',gen_random_uuid(),:actor,NOW(),NOW())
         RETURNING *`,
        {replacements:{chitId,monthId,amount:value,actor},transaction});
      return entries[0];
    });
  }
}
