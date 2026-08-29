import { Body, Controller, Get, Param, Post, Put, UseGuards, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateChitDto } from './dto/create-chit.dto';
import { SaveChitScheduleDto } from './dto/month-schedule.dto';
import { Sequelize } from 'sequelize-typescript';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

@ApiTags('Chits') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'chits',version:'v1'})
class ChitsController {
 constructor(private readonly db:Sequelize){}
 @Post() @ApiOperation({summary:'Create a draft chit and its monthly schedule'})
 async create(@Body()dto:CreateChitDto,@CurrentUser()user:any){
  if(dto.monthlyAmounts?.length&&dto.monthlyAmounts.length!==dto.totalMonths)throw new BadRequestException('monthlyAmounts must match totalMonths');
  const amounts=dto.monthlyAmounts?.length?dto.monthlyAmounts.map(Number):Array(dto.totalMonths).fill(Number(dto.firstMonthlyAmount));
  if(amounts.some((x:number)=>!Number.isFinite(x)||x<=0))throw new BadRequestException('Monthly amounts must be positive');
  const agentMonths=[...(dto.agentMonthNumbers??[])]; const bad=agentMonths.some(n=>n<1||n>dto.totalMonths)||new Set(agentMonths).size!==agentMonths.length; if(bad)throw new BadRequestException('Invalid agent month numbers');
  const totalChitAmount=Number(dto.totalChitAmount??(amounts[0]*dto.totalMembers));
  if(!Number.isFinite(totalChitAmount)||totalChitAmount<=0)throw new BadRequestException('totalChitAmount must be positive');
  return this.db.transaction(async transaction=>{
   const [chits]:any=await this.db.query(`INSERT INTO chits(id,creator_id,name,description,chit_type,status,total_members,total_months,total_chit_amount,accumulated_savings_amount,completed_months,start_date,due_day,creator_participates,collection_grace_days,agent_commission_mode,created_at,updated_at) VALUES(gen_random_uuid(),:creator,:name,:description,:type,'DRAFT',:members,:months,:face,0,0,:start,:dueDay,:creatorParticipates,7,:commissionMode,NOW(),NOW()) RETURNING *`,{replacements:{creator:user.sub,name:dto.name,description:dto.description??null,type:dto.chitType,members:dto.totalMembers,months:dto.totalMonths,face:totalChitAmount,start:dto.startDate,dueDay:dto.dueDay,creatorParticipates:dto.creatorParticipates,commissionMode:agentMonths.length?'PER_AGENT_MONTH':'NONE'},transaction});
   const chit=chits[0];
   for(let i=0;i<amounts.length;i++){const month=i+1;const date=new Date(dto.startDate);date.setMonth(date.getMonth()+i);date.setDate(Math.min(dto.dueDay,28));await this.db.query(`INSERT INTO chit_months(id,chit_id,month_number,scheduled_date,scheduled_amount,month_type,status,agent_id,created_at,updated_at) VALUES(gen_random_uuid(),:chit,:number,:date,:amount,:type,'SCHEDULED',:agent,NOW(),NOW())`,{replacements:{chit:chit.id,number:month,date:date.toISOString().slice(0,10),amount:amounts[i],type:agentMonths.includes(month)?'AGENT_CHIT':'ACTION',agent:agentMonths.includes(month)?(dto.agentId??null):null},transaction});}
   return {success:true,data:chit};
  });
 }
 @Get() async list(@CurrentUser()user:any){const [rows]:any=await this.db.query(`SELECT * FROM chits WHERE creator_id=:user OR id IN(SELECT chit_id FROM chit_participants WHERE user_id=:user) ORDER BY created_at DESC`,{replacements:{user:user.sub}});return {success:true,data:rows};}
 @Get(':id') async get(@Param('id')id:string,@CurrentUser()user:any){const [rows]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id AND(creator_id=:user OR id IN(SELECT chit_id FROM chit_participants WHERE user_id=:user))`,{replacements:{id,user:user.sub}});if(!rows.length)throw new NotFoundException('Chit not found');const [months]:any=await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:id ORDER BY month_number`,{replacements:{id}});return {success:true,data:{...rows[0],months,remainingMonths:Math.max(0,Number(rows[0].total_months)-Number(rows[0].completed_months||0))}};}
 @Put(':id/month-schedule') @ApiOperation({summary:'Set monthly scheduled amounts/dates before the chit is published'})
 async saveSchedule(@Param('id')id:string,@Body()dto:SaveChitScheduleDto,@CurrentUser()user:any){
  return this.db.transaction(async transaction=>{
   const [c]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id AND creator_id=:user FOR UPDATE`,{replacements:{id,user:user.sub},transaction});if(!c.length)throw new NotFoundException('Chit not found');const chit=c[0];
   if(!['DRAFT','INVITING','MEMBERS_CONFIRMED'].includes(chit.status))throw new ConflictException('Month schedule cannot be changed after publication/activation');
   if(dto.months.length!==Number(chit.total_months))throw new BadRequestException(`Exactly ${chit.total_months} monthly entries are required`);
   const seen=new Set<number>();for(const m of dto.months){if(seen.has(m.monthNumber))throw new BadRequestException(`Month ${m.monthNumber} is duplicated`);seen.add(m.monthNumber);if(m.monthNumber<1||m.monthNumber>Number(chit.total_months))throw new BadRequestException('Invalid month number');const amount=Number(m.scheduledAmount);if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException(`Month ${m.monthNumber} amount must be positive`);if(m.monthType==='AGENT_CHIT'&&!m.agentId)throw new BadRequestException(`Month ${m.monthNumber} requires an agent`);if(m.monthType!=='AGENT_CHIT'&&m.agentId)throw new BadRequestException(`Month ${m.monthNumber} cannot contain an agent`);await this.db.query(`UPDATE chit_months SET scheduled_date=:date,scheduled_amount=:amount,month_type=:type,agent_id=:agent,updated_at=NOW() WHERE chit_id=:chitId AND month_number=:number`,{replacements:{date:m.scheduledDate,amount,type:m.monthType,agent:m.agentId??null,chitId:id,number:m.monthNumber},transaction});}
   if(dto.totalChitAmount!==undefined){const face=Number(dto.totalChitAmount);if(!Number.isFinite(face)||face<=0)throw new BadRequestException('totalChitAmount must be positive');await this.db.query(`UPDATE chits SET total_chit_amount=:face,updated_at=NOW() WHERE id=:id`,{replacements:{id,face},transaction});}
   const [months]:any=await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:id ORDER BY month_number`,{replacements:{id},transaction});const [updated]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id`,{replacements:{id},transaction});return {success:true,data:{chit:updated[0],months}};
  });
 }
 @Post(':id/publish') async publish(@Param('id')id:string,@CurrentUser()user:any){return this.db.transaction(async transaction=>{const [rows]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id AND creator_id=:user FOR UPDATE`,{replacements:{id,user:user.sub},transaction});if(!rows.length)throw new NotFoundException('Chit not found');const c=rows[0];if(!['DRAFT','INVITING','MEMBERS_CONFIRMED'].includes(c.status))throw new ConflictException('Chit cannot be published in its current state');const [participantRows]:any=await this.db.query(`SELECT COUNT(*)::int AS participant_count FROM chit_participants WHERE chit_id=:id AND status='ACTIVE'`,{replacements:{id},transaction});if(Number(participantRows[0]?.participant_count??0)!==Number(c.total_members))throw new ConflictException(`Final member count must be ${c.total_members}`);await this.db.query(`UPDATE chit_participants SET status='ACTIVE',accepted_at=COALESCE(accepted_at,NOW()),joined_at=COALESCE(joined_at,NOW()),updated_at=NOW() WHERE chit_id=:id`,{replacements:{id},transaction});const [updated]:any=await this.db.query(`UPDATE chits SET status='READY_TO_START',published_at=NOW(),updated_at=NOW() WHERE id=:id RETURNING *`,{replacements:{id},transaction});return {success:true,data:{...updated[0],configurationLocked:true}};});}
}
@Module({controllers:[ChitsController]}) export class ChitsModule{}
