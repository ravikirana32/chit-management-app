import { Body, Controller, Get, Param, Post, Put, UseGuards, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateChitDto } from './dto/create-chit.dto';
import { SaveChitScheduleDto } from './dto/month-schedule.dto';
import { Sequelize } from 'sequelize-typescript';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

@ApiTags('Chits') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chits',version:'1'})
class ChitsController {
 constructor(private readonly db:Sequelize){}

 @Post()
 @ApiOperation({summary:'Create a draft chit with monthly contribution, payout and optional AGENT_CHIT schedule'})
 async create(@Body()dto:CreateChitDto,@CurrentUser()user:any){
  if(dto.monthlyAmounts?.length&&dto.monthlyAmounts.length!==dto.totalMonths)
    throw new BadRequestException('monthlyAmounts must match totalMonths');
  const amounts=dto.monthlyAmounts?.length?dto.monthlyAmounts.map(Number):Array(dto.totalMonths).fill(Number(dto.firstMonthlyAmount));
  if(amounts.some((x:number)=>!Number.isFinite(x)||x<=0)) throw new BadRequestException('Monthly contribution amounts must be positive');
  if(dto.fixedDrawPayoutAmounts?.length&&dto.fixedDrawPayoutAmounts.length!==dto.totalMonths)
    throw new BadRequestException('fixedDrawPayoutAmounts must match totalMonths');
  const payoutAmounts=dto.fixedDrawPayoutAmounts?.length?dto.fixedDrawPayoutAmounts.map(Number):amounts.slice();
  if(payoutAmounts.some((x:number)=>!Number.isFinite(x)||x<=0)) throw new BadRequestException('Monthly payout amounts must be positive');
  const agentMonths=[...(dto.agentMonthNumbers??[])];
  const bad=agentMonths.some(n=>n<1||n>dto.totalMonths)||new Set(agentMonths).size!==agentMonths.length;
  if(bad)throw new BadRequestException('Invalid agent month numbers');
  if(agentMonths.length&&!dto.agentId)throw new BadRequestException('agentId is required when AGENT_CHIT months are configured');
  const totalChitAmount=Number(dto.totalChitAmount??(amounts[0]*dto.totalMembers));
  if(!Number.isFinite(totalChitAmount)||totalChitAmount<=0)throw new BadRequestException('totalChitAmount must be positive');
  let resolvedAgentId: string | null = null;
  return this.db.transaction(async transaction=>{
   const [creatorAgent]: any = await this.db.query(`SELECT id FROM agents WHERE user_id=:user AND status='ACTIVE' LIMIT 1`,{replacements:{user:user.sub},transaction});
   if (creatorAgent.length) resolvedAgentId = creatorAgent[0].id;
   if(agentMonths.length){
    const [agentRows]: any = await this.db.query(`
      SELECT id, user_id, name, status FROM agents
      WHERE (id = :agentId OR user_id = :agentId) AND status = 'ACTIVE' LIMIT 1`,
      {replacements:{agentId:dto.agentId},transaction});
    if(!agentRows.length)throw new NotFoundException('Configured agent not found');
    resolvedAgentId=agentRows[0].id;
   }
   const [chits]:any=await this.db.query(`
     INSERT INTO chits
     (id,creator_id,name,description,chit_type,status,total_members,total_months,
      total_chit_amount,accumulated_savings_amount,completed_months,start_date,due_day,
      creator_participates,collection_grace_days,agent_commission_mode,created_at,updated_at)
     VALUES(gen_random_uuid(),:creator,:name,:description,:type,'DRAFT',:members,:months,
      :face,0,0,:start,:dueDay,:creatorParticipates,7,:commissionMode,NOW(),NOW())
     RETURNING *`,
     {replacements:{creator:user.sub,name:dto.name,description:dto.description??null,type:dto.chitType,
      members:dto.totalMembers,months:dto.totalMonths,face:totalChitAmount,start:dto.startDate,
      dueDay:dto.dueDay,creatorParticipates:dto.creatorParticipates,commissionMode:agentMonths.length?'PER_AGENT_MONTH':'NONE'},transaction});
   const chit=chits[0];
   if (resolvedAgentId) {
     await this.db.query(`INSERT INTO chit_agent_assignments
        (chit_id,agent_id,can_view_members,can_collect_cash,can_verify_payments,can_manage_chat,
         can_run_draw,can_run_auction,can_manage_chit,assigned_by,active)
        VALUES(:chit,:agent,true,true,true,true,true,true,true,:actor,true)
        ON CONFLICT(chit_id,agent_id) DO UPDATE SET can_view_members=true,can_collect_cash=true,
        can_verify_payments=true,can_manage_chat=true,can_run_draw=true,can_run_auction=true,
        can_manage_chit=true,active=true`,
       {replacements:{chit:chit.id,agent:resolvedAgentId,actor:user.sub},transaction});
   }
   for(let i=0;i<amounts.length;i++){
    const month=i+1; const dt=new Date(dto.startDate); dt.setMonth(dt.getMonth()+i); dt.setDate(Math.min(dto.dueDay,28));
    await this.db.query(`INSERT INTO chit_months
      (id,chit_id,month_number,scheduled_date,scheduled_amount,winner_payout_amount,month_type,status,agent_id,created_at,updated_at)
      VALUES(gen_random_uuid(),:chit,:number,:date,:amount,:payout,:type,'SCHEDULED',:agent,NOW(),NOW())`,
      {replacements:{chit:chit.id,number:month,date:dt.toISOString().slice(0,10),amount:amounts[i],
        payout:payoutAmounts[i],type:agentMonths.includes(month)?'AGENT_CHIT':'ACTION',
        agent:agentMonths.includes(month)?resolvedAgentId:null},transaction});
   }
   const [months]:any=await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:id ORDER BY month_number`,{replacements:{id:chit.id},transaction});
   return {success:true,data:{...chit,months}};
  });
 }

 @Get() async list(@CurrentUser()user:any){
  const [rows]:any=await this.db.query(`SELECT DISTINCT c.* FROM chits c
    LEFT JOIN chit_participants cp ON cp.chit_id=c.id AND cp.user_id=:user
    LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
    LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:user
    WHERE c.status<>'DELETED' AND (c.creator_id=:user OR cp.id IS NOT NULL OR ag.id IS NOT NULL) ORDER BY c.created_at DESC`,
    {replacements:{user:user.sub}});
  return {success:true,data:rows};
 }

 @Get(':id')
 async get(@Param('id')id:string,@CurrentUser()user:any){
  const [rows]:any=await this.db.query(`SELECT DISTINCT c.* FROM chits c
    LEFT JOIN chit_participants cp ON cp.chit_id=c.id AND cp.user_id=:user
    LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
    LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:user
    WHERE c.id=:id AND c.status<>'DELETED' AND (c.creator_id=:user OR cp.id IS NOT NULL OR ag.id IS NOT NULL)`,
    {replacements:{id,user:user.sub}});
  if(!rows.length)throw new NotFoundException('Chit not found');
  const [months]:any=await this.db.query(`SELECT cm.*,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.chit_month_id=cm.id
      AND p.status IN ('VERIFIED','PAID','SETTLED','COMPLETED')),0) AS verified_collections
    FROM chit_months cm WHERE cm.chit_id=:id ORDER BY cm.month_number`,{replacements:{id}});
  const chit=rows[0]; const currentSavings=Number(chit.accumulated_savings_amount||0);
  return {success:true,data:{...chit,currentSavings,savingsDisplay:`₹${currentSavings.toFixed(2)}`,
    months,remainingMonths:Math.max(0,Number(chit.total_months)-Number(chit.completed_months||0)),
    configurationNote:'For AGENT_CHIT months there is no draw. All active members still contribute and the configured agent receives winner_payout_amount.'}};
 }

 @Get(':id/financial-summary')
 async financialSummary(@Param('id')id:string,@CurrentUser()user:any){
  const [rows]:any=await this.db.query(`SELECT DISTINCT c.* FROM chits c
    LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
    LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:user
    WHERE c.id=:id AND (c.creator_id=:user OR ca.can_manage_chit=true)`,{replacements:{id,user:user.sub}});
  if(!rows.length)throw new NotFoundException('Chit not found');
  const chit=rows[0];
  const [months]:any=await this.db.query(`SELECT cm.*,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.chit_month_id=cm.id
      AND p.status IN ('VERIFIED','PAID','SETTLED','COMPLETED')),0)::numeric AS verified_collections
    FROM chit_months cm WHERE cm.chit_id=:id ORDER BY cm.month_number`,{replacements:{id}});
  let projectedSavings=Number(chit.accumulated_savings_amount||0);
  const summary=months.map((m:any)=>{
    const contribution=Number(m.scheduled_amount||0), expectedCollection=contribution*Number(chit.total_members||0);
    const verified=Number(m.verified_collections||0), assumedCollection=m.status==='COMPLETED'?verified:expectedCollection;
    const payout=Number(m.winner_payout_amount||0), projectedClosing=projectedSavings+assumedCollection-payout;
    const finalZeroAdjustment=m.month_number===Number(chit.total_months)?projectedSavings+assumedCollection:null;
    const row={monthNumber:Number(m.month_number),monthType:m.month_type,scheduledDate:m.scheduled_date,
      contributionPerMember:contribution,expectedCollection,verifiedCollections:verified,plannedPayout:payout,
      openingSavings:projectedSavings,projectedClosingSavings:projectedClosing,finalZeroAdjustmentPayout:finalZeroAdjustment,
      noDraw:m.month_type==='AGENT_CHIT'}; projectedSavings=projectedClosing; return row;
  });
  return {success:true,data:{chitId:id,currentSavedAmount:Number(chit.accumulated_savings_amount||0),
    currentSavedAmountDisplay:`₹${Number(chit.accumulated_savings_amount||0).toFixed(2)}`,
    projectedFinalSavings:projectedSavings,projectedFinalSavingsDisplay:`₹${projectedSavings.toFixed(2)}`,
    finalMonthPayoutNeededForZeroBalance:summary.length?summary[summary.length-1].finalZeroAdjustmentPayout:null,
    rule:'The agent can see accumulated savings before choosing/confirming later payouts. To finish at zero, the final month payout can be adjusted to the opening savings plus that month collection, subject to actual verified collections and sufficient funds.',
    months:summary}};
 }

 @Put(':id/month-schedule')
 async saveSchedule(@Param('id')id:string,@Body()dto:SaveChitScheduleDto,@CurrentUser()user:any){
  return this.db.transaction(async transaction=>{
   const [c]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id AND creator_id=:user FOR UPDATE`,{replacements:{id,user:user.sub},transaction});
   if(!c.length)throw new NotFoundException('Chit not found');
   const chit=c[0];
   if(!['DRAFT','INVITING','MEMBERS_CONFIRMED'].includes(chit.status))
    throw new ConflictException('Month schedule cannot be changed after publication/activation');
   if(dto.months.length!==Number(chit.total_months))throw new BadRequestException(`Exactly ${chit.total_months} monthly entries are required`);
   const seen=new Set<number>();
   for(const m of dto.months){
    if(seen.has(m.monthNumber))throw new BadRequestException(`Month ${m.monthNumber} is duplicated`); seen.add(m.monthNumber);
    if(m.monthNumber<1||m.monthNumber>Number(chit.total_months))throw new BadRequestException('Invalid month number');
    const amount=Number(m.scheduledAmount),payout=Number(m.winnerPayoutAmount);
    if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException(`Month ${m.monthNumber} contribution amount must be positive`);
    if(!Number.isFinite(payout)||payout<=0)throw new BadRequestException(`Month ${m.monthNumber} payout amount must be positive`);
    if(m.monthType==='AGENT_CHIT'&&!m.agentId)throw new BadRequestException(`Month ${m.monthNumber} requires an agent`);
    if(m.monthType!=='AGENT_CHIT'&&m.agentId)throw new BadRequestException(`Month ${m.monthNumber} cannot contain an agent`);
    if(m.agentId){
      const [agentRows]:any=await this.db.query(`SELECT id,user_id,name,status FROM agents
        WHERE (id=:agentId OR user_id=:agentId) AND status='ACTIVE' LIMIT 1`,{replacements:{agentId:m.agentId},transaction});
      if(!agentRows.length)throw new NotFoundException(`Agent not found for month ${m.monthNumber}`);
      m.agentId=agentRows[0].id;
    }
    await this.db.query(`UPDATE chit_months SET scheduled_date=:date,scheduled_amount=:amount,
      winner_payout_amount=:payout,month_type=:type,agent_id=:agent,updated_at=NOW()
      WHERE chit_id=:chitId AND month_number=:number`,
      {replacements:{date:m.scheduledDate,amount,payout,type:m.monthType,agent:m.agentId??null,chitId:id,number:m.monthNumber},transaction});
   }
   if(dto.totalChitAmount!==undefined){
    const face=Number(dto.totalChitAmount); if(!Number.isFinite(face)||face<=0)throw new BadRequestException('totalChitAmount must be positive');
    await this.db.query(`UPDATE chits SET total_chit_amount=:face,updated_at=NOW() WHERE id=:id`,{replacements:{id,face},transaction});
   }
   const [months]:any=await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:id ORDER BY month_number`,{replacements:{id},transaction});
   const [updated]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id`,{replacements:{id},transaction});
   return {success:true,data:{chit:updated[0],months}};
  });
 }

 @Post(':id/publish')
 async publish(@Param('id')id:string,@CurrentUser()user:any){
  return this.db.transaction(async transaction=>{
   const [rows]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id AND creator_id=:user FOR UPDATE`,{replacements:{id,user:user.sub},transaction});
   if(!rows.length)throw new NotFoundException('Chit not found');
   const c=rows[0];
   if(!['DRAFT','INVITING','MEMBERS_CONFIRMED'].includes(c.status))throw new ConflictException('Chit cannot be published in its current state');
   const [bad]:any=await this.db.query(`SELECT month_number FROM chit_months WHERE chit_id=:id AND
     (scheduled_amount IS NULL OR scheduled_amount<=0 OR winner_payout_amount IS NULL OR winner_payout_amount<=0 OR
      (month_type='AGENT_CHIT' AND agent_id IS NULL)) ORDER BY month_number`,{replacements:{id},transaction});
   if(bad.length)throw new ConflictException(`Every month needs contribution/payout; every AGENT_CHIT month needs an agent. First invalid month: ${bad[0].month_number}`);
   const [participantRows]:any=await this.db.query(`SELECT COUNT(*)::int AS participant_count FROM chit_participants WHERE chit_id=:id AND status='ACTIVE'`,{replacements:{id},transaction});
   if(Number(participantRows[0]?.participant_count??0)!==Number(c.total_members))throw new ConflictException(`Final member count must be ${c.total_members}`);
   await this.db.query(`UPDATE chit_participants SET status='ACTIVE',accepted_at=COALESCE(accepted_at,NOW()),
     joined_at=COALESCE(joined_at,NOW()),updated_at=NOW() WHERE chit_id=:id`,{replacements:{id},transaction});
   const [updated]:any=await this.db.query(`UPDATE chits SET status='READY_TO_START',published_at=NOW(),updated_at=NOW()
     WHERE id=:id RETURNING *`,{replacements:{id},transaction});
   return {success:true,data:{...updated[0],configurationLocked:true}};
  });
 }

 @Post(':id/start')
 @ApiOperation({summary:'Start a published chit. Moves READY_TO_START to ACTIVE and locks configuration.'})
 async start(@Param('id')id:string,@CurrentUser()user:any){
  return this.db.transaction(async transaction=>{
   const [rows]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id AND creator_id=:user FOR UPDATE`,
     {replacements:{id,user:user.sub},transaction});
   if(!rows.length)throw new NotFoundException('Chit not found');
   const c=rows[0];
   if(c.status==='ACTIVE')return {success:true,data:{...c,configurationLocked:true}};
   if(c.status!=='READY_TO_START')throw new ConflictException(`Chit cannot be started in its current state: ${c.status}`);
   const [first]:any=await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:id AND status NOT IN ('LOCKED','COMPLETED') ORDER BY month_number LIMIT 1`,
     {replacements:{id},transaction});
   if(!first.length)throw new ConflictException('Chit has no monthly schedule');
   
   const [updated]:any=await this.db.query(`UPDATE chits SET status='ACTIVE',updated_at=NOW() WHERE id=:id RETURNING *`,
     {replacements:{id},transaction});
   return {success:true,data:{...updated[0],startedMonth:first[0].month_number,configurationLocked:true}};
  });
 }
}

@Module({controllers:[ChitsController]})
export class ChitsModule{}
