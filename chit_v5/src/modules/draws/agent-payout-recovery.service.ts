import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {Sequelize} from 'sequelize-typescript';

@Injectable()
export class AgentPayoutRecoveryService{
 constructor(private readonly db:Sequelize){}
 async createOrRecover(chitId:string,monthId:string,actor:string){return this.db.transaction(async transaction=>{
  const[rows]:any=await this.db.query(`SELECT m.*,c.creator_id,c.status AS chit_status,c.total_members,c.accumulated_savings_amount,c.total_chit_amount FROM chit_months m JOIN chits c ON c.id=m.chit_id WHERE m.id=:monthId AND m.chit_id=:chitId FOR UPDATE OF m,c`,{replacements:{monthId,chitId},transaction});
  if(!rows.length)throw new NotFoundException('Chit month not found');const m=rows[0];
  if(String(m.month_type).toUpperCase()!=='AGENT_CHIT')throw new BadRequestException('This endpoint is only for AGENT_CHIT months');
  const[access]:any=await this.db.query(`SELECT 1 FROM chits c LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:actor WHERE c.id=:chitId AND(c.creator_id=:actor OR(ag.id IS NOT NULL AND(ca.can_collect_cash=true OR ca.can_manage_chit=true)) OR EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=:actor AND ur.role='ADMIN')) LIMIT 1`,{replacements:{chitId,actor},transaction});
  if(!access.length)throw new ConflictException('Agent Chit payout permission is required for this chit');
  if(!m.agent_id)throw new BadRequestException('AGENT_CHIT month requires an agent');
  const[agentRows]:any=await this.db.query(`SELECT id,user_id,name,upi_id,status FROM agents WHERE id=:agentId FOR UPDATE`,{replacements:{agentId:m.agent_id},transaction});
  if(!agentRows.length)throw new NotFoundException('Configured agent not found');
  const agent=agentRows[0];
  if(agent.status!=='ACTIVE')throw new ConflictException('Configured agent is not active');
  if(!agent.user_id)throw new ConflictException('Configured agent has no linked user account');

  // Settled is always the effective payout. This also repairs legacy data where
  // settlement notes no longer contain the AGENT_CHIT marker.
  const[existing]:any=await this.db.query(
    `SELECT p.*
     FROM payouts p
     WHERE p.chit_month_id=:monthId
       AND (
         p.notes LIKE 'AGENT_CHIT:%'
         OR p.recipient_agent_id=:agentId
         OR p.recipient_user_id=:agentUserId
       )
     ORDER BY CASE WHEN p.status='SETTLED' THEN 0 WHEN p.status='PENDING' THEN 1 ELSE 2 END,
              p.created_at DESC
     LIMIT 1
     FOR UPDATE`,
    {replacements:{monthId,agentId:agent.id,agentUserId:agent.user_id},transaction}
  );
  if(existing.length)return{
    success:true,
    existingPayout:true,
    payout:existing[0],
    requiresSettlement:String(existing[0].status).toUpperCase()==='PENDING',
    message:String(existing[0].status).toUpperCase()==='SETTLED'
      ?'Agent payout is already settled.'
      :'Agent payout exists and is ready for payment settlement.'
  };
  if(!['READY_TO_START','ACTIVE','RUNNING','COMPLETED'].includes(String(m.chit_status).toUpperCase()))throw new ConflictException(`Chit is not ready for Agent Chit settlement: ${m.chit_status}`);
  if(!['SCHEDULED','READY_FOR_ACTION','COLLECTION','COMPLETED'].includes(String(m.status).toUpperCase()))throw new ConflictException(`Agent Chit month is not ready for settlement: ${m.status}`);
  const[ob]:any=await this.db.query(`SELECT COUNT(*)::int AS open_count,COALESCE(SUM(outstanding_amount),0)::numeric AS outstanding FROM contribution_obligations WHERE chit_month_id=:monthId AND(outstanding_amount>0 OR status IN('DUE','PENDING','PARTIAL','OVERDUE','RECOVERY_PLAN','DEFAULTED','DISPUTED'))`,{replacements:{monthId},transaction});
  if(Number(ob[0]?.open_count)>0||Number(ob[0]?.outstanding)>0)throw new ConflictException(`All member contributions must be fully verified before paying the agent. Outstanding ₹${Number(ob[0]?.outstanding||0).toFixed(2)}.`);
  const amount=Number(m.winner_payout_amount??m.scheduled_amount??m.total_chit_amount);if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException('Invalid AGENT_CHIT payout amount');
  const[collections]:any=await this.db.query(`SELECT COALESCE(SUM(amount),0)::numeric AS collected FROM payments WHERE chit_id=:chitId AND chit_month_id=:monthId AND status IN('VERIFIED','PAID','SETTLED','COMPLETED')`,{replacements:{chitId,monthId},transaction});const collected=Number(collections[0]?.collected||0);const opening=Number(m.accumulated_savings_amount||0);const available=opening+collected;if(available<amount)throw new ConflictException(`Insufficient verified funds for Agent Chit payout. Required ₹${amount.toFixed(2)}, available ₹${available.toFixed(2)}.`);
  const[payout]:any=await this.db.query(`INSERT INTO payouts(id,chit_id,chit_month_id,recipient_user_id,recipient_agent_id,amount,payment_method,status,recorded_by,notes,created_at,updated_at) VALUES(gen_random_uuid(),:chitId,:monthId,:recipient,:agentId,:amount,'UPI','PENDING',:actor,:notes,NOW(),NOW()) RETURNING *`,{replacements:{chitId,monthId,recipient:agent.user_id,agentId:agent.id,amount,actor,notes:`AGENT_CHIT:${agent.id} Agent ${agent.name}; no draw; all members contribute`},transaction});
  await this.db.query(`UPDATE chit_months SET status='COMPLETED',updated_at=NOW() WHERE id=:monthId`,{replacements:{monthId},transaction});
  await this.db.query(`UPDATE chits SET completed_months=(SELECT COUNT(*) FROM chit_months WHERE chit_id=:chitId AND status IN('COMPLETED','LOCKED')),status=CASE WHEN(SELECT COUNT(*) FROM chit_months WHERE chit_id=:chitId AND status='LOCKED')>=total_months THEN 'COMPLETED' ELSE 'ACTIVE' END,updated_at=NOW() WHERE id=:chitId`,{replacements:{chitId},transaction});
  await this.db.query(`INSERT INTO audit_logs(id,actor_user_id,chit_id,action,entity_type,entity_id,after_data,created_at,updated_at)VALUES(gen_random_uuid(),:actor,:chitId,'AGENT_CHIT_PAYOUT_CREATED','CHIT_MONTH',:monthId,:data,NOW(),NOW())`,{replacements:{actor,chitId,monthId,data:JSON.stringify({agentId:agent.id,agentUserId:agent.user_id,amount,collected,openingSavings:opening,settlementDeferred:true})},transaction});
  return{success:true,existingPayout:false,payout:payout[0],requiresSettlement:true,agent:{id:agent.id,name:agent.name,upiId:agent.upi_id},collectedAmount:collected,openingSavings:opening,agentPayout:amount,message:'Agent payout created as PENDING. Complete the actual UPI/bank/cash settlement, then close and lock the month.'};
 });}
}
