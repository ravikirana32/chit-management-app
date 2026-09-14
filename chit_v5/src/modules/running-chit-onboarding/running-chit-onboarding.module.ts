import { Body, Controller, Param, Post, UseGuards, BadRequestException, ConflictException, NotFoundException, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsDecimal, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class RunningMemberDto {
 @ApiPropertyOptional() @IsOptional() @IsUUID() userId?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() mobile?:string;
 @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) sequence?:number;
}
class RunningPayoutComponentDto {
 @ApiProperty() @IsDecimal() amount!:string;
 @ApiProperty({enum:['CASH','UPI','BANK_TRANSFER','OTHER']}) @IsIn(['CASH','UPI','BANK_TRANSFER','OTHER']) method!:string;
 @ApiPropertyOptional() @IsOptional() @IsString() reference?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() notes?:string;
}
class HistoricalPaymentDto {
 @ApiProperty() @IsString() memberId!:string;
 @ApiProperty() @IsDecimal() amount!:string;
 @ApiProperty({enum:['CASH','UPI']}) @IsIn(['CASH','UPI']) method!:string;
 @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() reference?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() notes?:string;
}
class FinalizeHistoricalMonthDto {
 @ApiProperty() @IsDecimal() contributionPerMember!:string;
 @ApiPropertyOptional() @IsOptional() @IsDateString() completedAt?:string;
 @ApiPropertyOptional() @IsOptional() @IsDecimal() openingSavings?:string;
 @ApiProperty() @IsDecimal() collectedAmount!:string;
 @ApiPropertyOptional() @IsOptional() @IsString() winnerMemberId?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() winnerName?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() winnerMobile?:string;
 @ApiPropertyOptional() @IsOptional() @IsDecimal() payoutAmount?:string;
 @ApiPropertyOptional() @IsOptional() @IsDecimal() discountAmount?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() winnerReference?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() notes?:string;
 @ApiPropertyOptional({type:[RunningPayoutComponentDto]}) @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>RunningPayoutComponentDto) payoutComponents?:RunningPayoutComponentDto[];
 @ApiProperty({type:[HistoricalPaymentDto]}) @IsArray() @ValidateNested({each:true}) @Type(()=>HistoricalPaymentDto) payments!:HistoricalPaymentDto[];
}
class CreateRunningChitDto {
 @ApiProperty() @IsString() @IsNotEmpty() name!:string;
 @ApiPropertyOptional() @IsOptional() @IsString() description?:string;
 @ApiProperty({enum:['FIXED_DRAW','AUCTION']}) @IsIn(['FIXED_DRAW','AUCTION']) chitType!:string;
 @ApiProperty() @IsInt() @Min(2) totalMembers!:number;
 @ApiProperty() @IsInt() @Min(2) totalMonths!:number;
 @ApiProperty() @IsInt() @Min(1) historicalMonthCount!:number;
 @ApiProperty() @IsDateString() originalStartDate!:string;
 @ApiProperty() @IsInt() @Min(1) dueDay!:number;
 @ApiProperty() @IsDecimal() totalChitAmount!:string;
 @ApiPropertyOptional() @IsOptional() @IsBoolean() creatorParticipates?:boolean;
 @ApiPropertyOptional() @IsOptional() @IsUUID() agentId?:string;
 @ApiPropertyOptional({type:[Number]}) @IsOptional() @IsArray() @IsInt({each:true}) @Min(1,{each:true}) agentMonthNumbers?:number[];
 @ApiProperty({type:[RunningMemberDto]}) @IsArray() @ValidateNested({each:true}) @Type(()=>RunningMemberDto) members!:RunningMemberDto[];
 @ApiPropertyOptional({type:[String]}) @IsOptional() @IsArray() @IsDecimal({}, {each:true}) monthlyAmounts?:string[];
 @ApiPropertyOptional({type:[String]}) @IsOptional() @IsArray() @IsString({each:true}) payoutAmounts?:string[];
}

@ApiTags('Running Chit Onboarding') @ApiBearerAuth('access-token') @UseGuards(JwtAuthGuard)
@Controller({path:'running-chit-onboarding',version:'1'})
export class RunningChitOnboardingController {
 constructor(private readonly db:Sequelize){}
 private async resolveUserId(input:RunningMemberDto,tx:any){
  if(input.userId){const [r]:any=await this.db.query(`SELECT id FROM users WHERE id=:id LIMIT 1`,{replacements:{id:input.userId},transaction:tx});if(!r.length)throw new NotFoundException(`Member user ${input.userId} not found`);return r[0].id;}
  if(input.mobile){const [r]:any=await this.db.query(`SELECT id FROM users WHERE normalized_mobile=:mobile OR mobile_number=:mobile LIMIT 1`,{replacements:{mobile:input.mobile},transaction:tx});if(!r.length)throw new NotFoundException(`Member with mobile ${input.mobile} not found. Create the user first.`);return r[0].id;}
  throw new BadRequestException('Each running-chit member requires userId or mobile');
 }
 private async canManage(chitId:string,userId:string,tx?:any){const [r]:any=await this.db.query(`SELECT 1 FROM chits c WHERE c.id=:chitId AND (c.creator_id=:userId OR EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN')) LIMIT 1`,{replacements:{chitId,userId},transaction:tx});return !!r.length;}
 private monthType(chitType:string,month:any){const t=String(month.month_type||'').toUpperCase();if(t==='AGENT_CHIT')return'AGENT_CHIT';return String(chitType).toUpperCase()==='AUCTION'?'AUCTION':'FIXED_DRAW';}
 private face(chit:any){const raw=chit?.total_chit_amount??chit?.totalChitAmount;const x=Number(raw);if(!Number.isFinite(x)||x<=0)throw new BadRequestException('Chit total amount is invalid');return x;}

 @Post() @ApiOperation({summary:'Create a running/traditional chit and generate its full schedule'})
 async create(@Body()dto:CreateRunningChitDto,@CurrentUser()u:any){
  return this.db.transaction(async transaction=>{
   if(dto.members.length!==dto.totalMembers)throw new BadRequestException(`Exactly ${dto.totalMembers} members are required`);
   if(dto.historicalMonthCount<1||dto.historicalMonthCount>=dto.totalMonths)throw new BadRequestException('historicalMonthCount must be between 1 and totalMonths - 1');
   const keys=dto.members.map(m=>m.userId||`mobile:${m.mobile}`);if(new Set(keys).size!==keys.length)throw new BadRequestException('Duplicate running-chit members are not allowed');
   const face=this.face(dto);const monthlyContribution=face/dto.totalMembers;
   const amounts=dto.monthlyAmounts?.length?dto.monthlyAmounts.map(Number):Array(dto.totalMonths).fill(monthlyContribution);
   if(amounts.length!==dto.totalMonths||amounts.some(x=>!Number.isFinite(x)||x<=0))throw new BadRequestException('monthlyAmounts must contain one positive amount for every month');
   const agentMonths=[...(dto.agentMonthNumbers||[])].map(Number).sort((a,b)=>a-b);
   if(new Set(agentMonths).size!==agentMonths.length||agentMonths.some(x=>x<1||x>dto.totalMonths))throw new BadRequestException('Invalid agent month numbers');
   if(agentMonths.length>1)throw new BadRequestException('Only one AGENT_CHIT month can be configured per running chit');
   if(agentMonths.length&&!dto.agentId&&!await this.hasCurrentAgent(u.sub,transaction))throw new BadRequestException('A responsible agent is required when AGENT_CHIT months are configured');
   let agentId:string|null=null;
   if(dto.agentId){const [r]:any=await this.db.query(`SELECT id FROM agents WHERE (id=:id OR user_id=:id) AND status='ACTIVE' LIMIT 1`,{replacements:{id:dto.agentId},transaction});if(!r.length)throw new NotFoundException('Active responsible agent not found');agentId=r[0].id;}
   else if(agentMonths.length){const [r]:any=await this.db.query(`SELECT id FROM agents WHERE user_id=:u AND status='ACTIVE' LIMIT 1`,{replacements:{u:u.sub},transaction});if(r.length)agentId=r[0].id;}
   const payoutAmounts=dto.payoutAmounts?.length?dto.payoutAmounts.map(v=>Number(v)):Array(dto.totalMonths).fill(face);
   if(payoutAmounts.length!==dto.totalMonths)throw new BadRequestException('payoutAmounts must match totalMonths when supplied');
   for(const m of agentMonths){if(!Number.isFinite(payoutAmounts[m-1])||payoutAmounts[m-1]<=0)throw new BadRequestException(`Agent payout for Month ${m} must be positive`);}
   const[cr]:any=await this.db.query(`INSERT INTO chits(id,creator_id,name,description,chit_type,status,total_members,total_months,total_chit_amount,accumulated_savings_amount,completed_months,start_date,due_day,creator_participates,collection_grace_days,agent_commission_mode,started_at,onboarding_mode,historical_month_count,created_at,updated_at) VALUES(gen_random_uuid(),:creator,:name,:description,:type,'DRAFT',:members,:months,:face,0,0,:start,:due,:creatorParticipates,7,:commissionMode,NULL,'RUNNING_CHIT',:historicalCount,NOW(),NOW()) RETURNING *`,{replacements:{creator:u.sub,name:dto.name.trim(),description:dto.description||null,type:dto.chitType,members:dto.totalMembers,months:dto.totalMonths,face,start:dto.originalStartDate,due:Math.min(28,Math.max(1,dto.dueDay)),creatorParticipates:dto.creatorParticipates===true,commissionMode:agentId?'PER_AGENT_MONTH':'NONE',historicalCount:dto.historicalMonthCount},transaction});
   const chit=cr[0];
   for(let i=0;i<dto.members.length;i++){const memberUserId=await this.resolveUserId(dto.members[i],transaction);if(dto.creatorParticipates&&memberUserId===u.sub)continue;await this.db.query(`INSERT INTO chit_participants(id,chit_id,user_id,participation_role,status,joined_at,accepted_at,participant_sequence,notes,created_at,updated_at) VALUES(gen_random_uuid(),:chit,:user,'PARTICIPANT','ACTIVE',:joined,:joined,:seq,'Running chit onboarding member',NOW(),NOW())`,{replacements:{chit:chit.id,user:memberUserId,joined:dto.originalStartDate,seq:dto.members[i].sequence||i+1},transaction});}
   if(dto.creatorParticipates){const[e]:any=await this.db.query(`SELECT 1 FROM chit_participants WHERE chit_id=:chit AND user_id=:user LIMIT 1`,{replacements:{chit:chit.id,user:u.sub},transaction});if(!e.length)await this.db.query(`INSERT INTO chit_participants(id,chit_id,user_id,participation_role,status,joined_at,accepted_at,participant_sequence,notes,created_at,updated_at) VALUES(gen_random_uuid(),:chit,:user,'PARTICIPANT','ACTIVE',:joined,:joined,:seq,'Creator participating in running chit',NOW(),NOW())`,{replacements:{chit:chit.id,user:u.sub,joined:dto.originalStartDate,seq:dto.members.length},transaction});}
   if(agentId)await this.db.query(`INSERT INTO chit_agent_assignments(chit_id,agent_id,can_view_members,can_collect_cash,can_verify_payments,can_manage_chat,can_run_draw,can_run_auction,can_manage_chit,assigned_by,active) VALUES(:chit,:agent,true,true,true,true,true,true,true,:actor,true) ON CONFLICT(chit_id,agent_id) DO UPDATE SET active=true,can_view_members=true,can_collect_cash=true,can_verify_payments=true,can_manage_chat=true,can_run_draw=true,can_run_auction=true,can_manage_chit=true`,{replacements:{chit:chit.id,agent:agentId,actor:u.sub},transaction});
   for(let i=0;i<dto.totalMonths;i++){const m=i+1;const date=new Date(dto.originalStartDate);date.setMonth(date.getMonth()+i);date.setDate(Math.min(28,Math.max(1,dto.dueDay)));const isAgent=agentMonths.includes(m);const plannedPayout=isAgent?payoutAmounts[i]:(String(dto.chitType).toUpperCase()==='FIXED_DRAW'?face:null);await this.db.query(`INSERT INTO chit_months(id,chit_id,month_number,scheduled_date,scheduled_amount,winner_payout_amount,month_type,status,agent_id,created_at,updated_at) VALUES(gen_random_uuid(),:chit,:number,:date,:amount,:payout,:type,'SCHEDULED',:agent,NOW(),NOW())`,{replacements:{chit:chit.id,number:m,date:date.toISOString().slice(0,10),amount:amounts[i],payout:plannedPayout,type:isAgent?'AGENT_CHIT':String(dto.chitType).toUpperCase()==='AUCTION'?'AUCTION':'FIXED_DRAW',agent:isAgent?agentId:null},transaction});}
   const[months]:any=await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:id ORDER BY month_number`,{replacements:{id:chit.id},transaction});
   return{success:true,data:{...chit,onboardingMode:'RUNNING_CHIT',historicalMonthsToFinalize:dto.historicalMonthCount,nextMonth:dto.historicalMonthCount+1,months}};
  });
 }
 private async hasCurrentAgent(userId:string,tx:any){const[r]:any=await this.db.query(`SELECT 1 FROM agents WHERE user_id=:u AND status='ACTIVE' LIMIT 1`,{replacements:{u:userId},transaction:tx});return !!r.length;}

 @Post(':chitId/months/:monthNumber/finalize') @ApiOperation({summary:'Finalize and permanently lock one historical month'})
 async finalize(@Param('chitId')chitId:string,@Param('monthNumber')raw:string,@Body()dto:FinalizeHistoricalMonthDto,@CurrentUser()u:any){
  const monthNumber=Number(raw);if(!Number.isInteger(monthNumber)||monthNumber<1)throw new BadRequestException('Invalid month number');
  return this.db.transaction(async transaction=>{
   if(!await this.canManage(chitId,u.sub,transaction))throw new NotFoundException('Running chit not found');
   const[chits]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id FOR UPDATE`,{replacements:{id:chitId},transaction});if(!chits.length)throw new NotFoundException('Running chit not found');const chit=chits[0];
   const[months]:any=await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:chit AND month_number=:month FOR UPDATE`,{replacements:{chit:chitId,month:monthNumber},transaction});if(!months.length)throw new NotFoundException(`Month ${monthNumber} not found`);const month=months[0];
   const status=String(month.status||'').toUpperCase();if(String(month.data_origin||'LIVE').toUpperCase()==='HISTORICAL'||status==='LOCKED')throw new ConflictException(`Month ${monthNumber} is already finalized and locked`);
   const target=Number(chit.historical_month_count||0);if(target<1)throw new ConflictException('Running chit historical month count is not configured');if(monthNumber>target)throw new ConflictException(`Month ${monthNumber} is not a historical month. Takeover starts at Month ${target+1}.`);if(monthNumber>Number(chit.total_months))throw new BadRequestException('Month is outside the chit duration');
   const expectedSequence=Number(chit.completed_months||0)+1;if(monthNumber!==expectedSequence)throw new ConflictException(`Finalize historical months in order. Month ${expectedSequence} must be finalized first.`);
   const[participantRows]:any=await this.db.query(`SELECT cp.id,cp.user_id,u.mobile_number,cp.participant_sequence FROM chit_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.chit_id=:chit AND cp.status='ACTIVE' ORDER BY cp.participant_sequence`,{replacements:{chit:chitId},transaction});const participants=participantRows;if(!participants.length)throw new ConflictException('Running chit has no active participants');
   const participantCount=participants.length;const contribution=Number(dto.contributionPerMember);if(!Number.isFinite(contribution)||contribution<=0)throw new BadRequestException('Contribution per member must be positive');const expected=contribution*participantCount;const opening=monthNumber===1?0:Number(chit.accumulated_savings_amount||0);if(monthNumber>1&&(!Number.isFinite(opening)||opening<0))throw new BadRequestException('Opening savings could not be derived');
   const suppliedCollected=Number(dto.collectedAmount);if(!Number.isFinite(suppliedCollected)||Math.abs(suppliedCollected-expected)>0.01)throw new BadRequestException(`Historical collected amount is derived as ${expected.toFixed(2)} (${contribution.toFixed(2)} × ${participantCount} members).`);
   const paymentByUser=new Map<string,any>();let paymentTotal=0;const resolveMember=(value:string)=>{const hit=participants.find((x:any)=>String(x.user_id)===String(value)||(x.mobile_number&&String(x.mobile_number)===String(value)));return hit?.user_id||null;};
   for(const p of dto.payments||[]){const memberId=resolveMember(p.memberId);if(!memberId)throw new BadRequestException(`Historical payment references non-member ${p.memberId}`);const amount=Number(p.amount);if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException('Historical payment amounts must be positive');const method=String(p.method||'').toUpperCase();if(!['CASH','UPI'].includes(method))throw new BadRequestException('Historical payment method must be CASH or UPI');if(paymentByUser.has(memberId))throw new BadRequestException(`Duplicate historical payment row for member ${p.memberId}`);paymentByUser.set(memberId,{...p,memberId,amount,method});paymentTotal+=amount;}
   if(paymentByUser.size!==participantCount)throw new BadRequestException(`Historical month requires one payment row for every active member (${participantCount} rows).`);if(Math.abs(paymentTotal-expected)>0.01)throw new BadRequestException(`Historical payment rows (${paymentTotal.toFixed(2)}) must equal derived collection (${expected.toFixed(2)})`);for(const p of participants){const row=paymentByUser.get(String(p.user_id));if(!row||Math.abs(row.amount-contribution)>0.01)throw new BadRequestException(`Historical payment for member ${p.participant_sequence} must equal the monthly contribution ${contribution.toFixed(2)}.`);}
   const chitType=String(chit.chit_type||'').toUpperCase();const kind=this.monthType(chitType,month);let winnerUserId:string|null=null;let discount=0;let payout=0;
   if(kind==='FIXED_DRAW'){
    if(!dto.payoutAmount)throw new BadRequestException('Fixed Draw historical month requires the actual payout amount');payout=Number(dto.payoutAmount);if(!Number.isFinite(payout)||payout<=0)throw new BadRequestException('Fixed Draw payout must be positive');
    winnerUserId=dto.winnerMemberId?resolveMember(dto.winnerMemberId):null;if(!winnerUserId)throw new BadRequestException('Fixed Draw historical month requires a winner UUID or mobile number');
   }else if(kind==='AUCTION'){
    discount=Number(dto.discountAmount||0);if(!Number.isFinite(discount)||discount<0||discount>Number(chit.total_chit_amount))throw new BadRequestException('Auction discount is invalid');payout=Number(chit.total_chit_amount)-discount;
    if(dto.payoutAmount!=null&&Math.abs(Number(dto.payoutAmount)-payout)>0.01)throw new BadRequestException(`Auction payout is derived as ${payout.toFixed(2)} from the chit amount and discount`);
    winnerUserId=dto.winnerMemberId?resolveMember(dto.winnerMemberId):null;if(!winnerUserId)throw new BadRequestException('Auction historical month requires a winner UUID or mobile number');
   }else{
    const configured=Number(month.winner_payout_amount);payout=dto.payoutAmount!=null?Number(dto.payoutAmount):configured;if(!Number.isFinite(payout)||payout<=0)throw new BadRequestException('Agent Chit historical month requires a positive configured agent payout');if(Number.isFinite(configured)&&Math.abs(payout-configured)>0.01)throw new BadRequestException(`Agent Chit payout must match the configured monthly amount ${configured.toFixed(2)}`);
    const[ar]:any=await this.db.query(`SELECT id,user_id,name FROM agents WHERE id=:id AND status='ACTIVE' LIMIT 1`,{replacements:{id:month.agent_id},transaction});if(!ar.length)throw new BadRequestException('Agent Chit month has no active responsible agent');
   }
   if(payout>opening+expected+0.01)throw new BadRequestException('Historical payout cannot exceed available funds');const closing=opening+expected-payout;if(closing<-0.01)throw new BadRequestException('Historical closing savings cannot be negative');
   const components=Array.isArray(dto.payoutComponents)&&dto.payoutComponents.length?dto.payoutComponents.map(c=>({amount:Number(c.amount),method:String(c.method||'').toUpperCase(),reference:c.reference||null,notes:c.notes||null})): [{amount:payout,method:'CASH',reference:dto.winnerReference||null,notes:'Historical payout default'}];const componentTotal=components.reduce((a,c)=>a+c.amount,0);if(payout>0&&Math.abs(componentTotal-payout)>0.01)throw new BadRequestException('Payout components must equal the derived payout amount');for(const c of components){if(!Number.isFinite(c.amount)||c.amount<=0)throw new BadRequestException('Historical payout component amounts must be positive');if(!['CASH','UPI','BANK_TRANSFER','OTHER'].includes(c.method))throw new BadRequestException('Invalid historical payout method');}
   const historicalData={dataOrigin:'HISTORICAL',finalizedBy:u.sub,finalizedAt:new Date().toISOString(),completedAt:dto.completedAt||month.scheduled_date,monthType:kind,contributionPerMember:contribution,expectedCollection:expected,collectedAmount:expected,openingSavings:opening,closingSavings:Math.max(0,closing),winnerMemberId:winnerUserId,winnerName:dto.winnerName||null,winnerMobile:dto.winnerMobile||null,payoutAmount:payout,discountAmount:kind==='AUCTION'?discount:0,winnerReference:dto.winnerReference||null,payoutComponents:components,notes:dto.notes||null};
   await this.db.query(`UPDATE chit_months SET data_origin='HISTORICAL',status='LOCKED',scheduled_amount=:contribution,winner_payout_amount=:payout,historical_data=:data::jsonb,locked_at=NOW(),locked_by=:actor,updated_at=NOW() WHERE id=:id`,{replacements:{id:month.id,actor:u.sub,contribution,payout,data:JSON.stringify(historicalData)},transaction});
   for(const participant of participants){const row=paymentByUser.get(String(participant.user_id));const[ob]:any=await this.db.query(`SELECT id,paid_amount FROM contribution_obligations WHERE chit_month_id=:month AND chit_participant_id=:participant LIMIT 1 FOR UPDATE`,{replacements:{month:month.id,participant:participant.id},transaction});let obligation=ob[0];if(!obligation){const[c]:any=await this.db.query(`INSERT INTO contribution_obligations(id,chit_month_id,chit_participant_id,due_amount,paid_amount,outstanding_amount,status,due_date,created_at,updated_at) VALUES(gen_random_uuid(),:month,:participant,:due,:paid,0,'PAID',:dueDate,NOW(),NOW()) RETURNING *`,{replacements:{month:month.id,participant:participant.id,due:contribution,paid:contribution,dueDate:month.scheduled_date},transaction});obligation=c[0];}else{if(Number(obligation.paid_amount||0)>0)throw new ConflictException(`Historical obligation for member ${participant.participant_sequence} already has payment data`);await this.db.query(`UPDATE contribution_obligations SET due_amount=:due,paid_amount=:paid,outstanding_amount=0,status='PAID',due_date=:dueDate,updated_at=NOW() WHERE id=:id`,{replacements:{id:obligation.id,due:contribution,paid:contribution,dueDate:month.scheduled_date},transaction});}
    const[pay]:any=await this.db.query(`INSERT INTO payments(id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,payment_method,status,transaction_reference,payment_date,submitted_at,verified_at,recorded_by,verified_by,notes,receipt_number,created_at,updated_at) VALUES(gen_random_uuid(),:chit,:month,:participant,:obligation,:amount,:method,'VERIFIED',:reference,:paymentDate,:paymentDate,:paymentDate,:actor,:actor,:notes,:receipt,NOW(),NOW()) RETURNING id`,{replacements:{chit:chitId,month:month.id,participant:participant.id,obligation:obligation.id,amount:contribution,method:row.method,reference:row.reference||null,paymentDate:row.paymentDate||month.scheduled_date,actor:u.sub,notes:row.notes||'Historical running-chit entry',receipt:row.reference||null},transaction});
    await this.db.query(`INSERT INTO ledger_entries(id,chit_id,chit_month_id,chit_participant_id,entry_type,amount,description,reference_type,reference_id,created_by,created_at,updated_at) VALUES(gen_random_uuid(),:chit,:month,:participant,'CONTRIBUTION',:amount,'Historical running-chit contribution','PAYMENT',:payment,:actor,NOW(),NOW())`,{replacements:{chit:chitId,month:month.id,participant:participant.id,amount:contribution,payment:pay[0].id,actor:u.sub},transaction});
   }
   if(payout>0){const[existing]:any=await this.db.query(`SELECT id FROM payouts WHERE chit_month_id=:month AND status='SETTLED' LIMIT 1`,{replacements:{month:month.id},transaction});if(existing.length)throw new ConflictException(`Historical payout for Month ${monthNumber} already exists`);const parentMethod=components.length===1?components[0].method:'SPLIT';const parentRef=components.map(x=>`${x.method}:${x.reference||'NO-REF'}`).join(' | ');let agentRecipient:string|null=null;if(kind==='AGENT_CHIT'){const[ar]:any=await this.db.query(`SELECT id FROM agents WHERE id=:id AND status='ACTIVE' LIMIT 1`,{replacements:{id:month.agent_id},transaction});if(!ar.length)throw new BadRequestException('Responsible agent is not active');agentRecipient=ar[0].id;}
    const[po]:any=await this.db.query(`INSERT INTO payouts(id,chit_id,chit_month_id,payout_calculation_id,recipient_user_id,recipient_agent_id,amount,payment_method,status,transaction_reference,paid_at,recorded_by,verified_by,receipt_number,notes,created_at,updated_at) VALUES(gen_random_uuid(),:chit,:month,NULL,:recipientUser,:recipientAgent,:amount,:method,'SETTLED',:reference,:paidAt,:actor,:actor,:receipt,:notes,NOW(),NOW()) RETURNING id`,{replacements:{chit:chitId,month:month.id,recipientUser:kind==='AGENT_CHIT'?null:winnerUserId,recipientAgent:agentRecipient,amount:payout,method:parentMethod,reference:parentRef,paidAt:dto.completedAt||month.scheduled_date,actor:u.sub,receipt:dto.winnerReference||null,notes:kind==='AGENT_CHIT'?'Historical AGENT_CHIT payout':'Historical running-chit payout'},transaction});
    const payoutId=po[0].id;for(const c of components)await this.db.query(`INSERT INTO payout_transactions(id,payout_id,amount,payment_method,transaction_reference,status,paid_at,recorded_by,notes,created_at,updated_at) VALUES(gen_random_uuid(),:payout,:amount,:method,:reference,'SETTLED',:paidAt,:actor,:notes,NOW(),NOW())`,{replacements:{payout:payoutId,amount:c.amount,method:c.method,reference:c.reference,paidAt:dto.completedAt||month.scheduled_date,actor:u.sub,notes:c.notes},transaction});
    await this.db.query(`INSERT INTO ledger_entries(id,chit_id,chit_month_id,chit_participant_id,entry_type,amount,description,reference_type,reference_id,created_by,created_at,updated_at) VALUES(gen_random_uuid(),:chit,:month,NULL,'PAYOUT',:amount,'Historical running-chit payout','PAYOUT',:payout,:actor,NOW(),NOW())`,{replacements:{chit:chitId,month:month.id,amount:-payout,payout:payoutId,actor:u.sub},transaction});
   }
   await this.db.query(`UPDATE chits SET accumulated_savings_amount=:closing,completed_months=:completed,updated_at=NOW() WHERE id=:chit`,{replacements:{closing:Math.max(0,closing),completed:monthNumber,chit:chitId},transaction});
   return{success:true,data:{chitId,monthNumber,status:'LOCKED',dataOrigin:'HISTORICAL',monthType:kind,contributionPerMember:contribution,expectedCollection:expected,collectedAmount:expected,openingSavings:opening,payoutAmount:payout,closingSavings:Math.max(0,closing),message:`Month ${monthNumber} finalized and locked. Historical financial values were derived server-side.`}};
  });
 }

 @Post(':chitId/activate/:monthNumber') @ApiOperation({summary:'Activate the first live month after historical onboarding is complete'})
 async activate(@Param('chitId')chitId:string,@Param('monthNumber')raw:string,@CurrentUser()u:any){const monthNumber=Number(raw);return this.db.transaction(async transaction=>{if(!await this.canManage(chitId,u.sub,transaction))throw new NotFoundException('Running chit not found');const[chits]:any=await this.db.query(`SELECT * FROM chits WHERE id=:id FOR UPDATE`,{replacements:{id:chitId},transaction});if(!chits.length)throw new NotFoundException('Running chit not found');const chit=chits[0];const completed=Number(chit.completed_months||0),target=Number(chit.historical_month_count||0);if(monthNumber!==target+1)throw new ConflictException(`Month ${target+1} is the configured takeover month`);if(completed!==target)throw new ConflictException(`Finalize all ${target} historical month(s) before activation`);const[months]:any=await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:chit AND month_number=:month FOR UPDATE`,{replacements:{chit:chitId,month:monthNumber},transaction});if(!months.length)throw new NotFoundException(`Month ${monthNumber} not found`);if(monthNumber>Number(chit.total_months))throw new BadRequestException('No remaining live month');const[openHistorical]:any=await this.db.query(`SELECT COUNT(*)::int AS count FROM chit_months WHERE chit_id=:chit AND month_number<=:historical AND COALESCE(data_origin,'LIVE')<>'HISTORICAL'`,{replacements:{chit:chitId,historical:target},transaction});if(Number(openHistorical[0]?.count||0)>0)throw new ConflictException('All configured historical months must be finalized before activation');await this.db.query(`UPDATE chit_months SET status=CASE WHEN month_number=:month THEN 'ACTIVE' WHEN month_number<:month THEN 'LOCKED' ELSE status END,updated_at=NOW() WHERE chit_id=:chit`,{replacements:{chit:chitId,month:monthNumber},transaction});await this.db.query(`UPDATE chit_months SET data_origin='LIVE' WHERE chit_id=:chit AND month_number=:month`,{replacements:{chit:chitId,month:monthNumber},transaction});await this.db.query(`UPDATE chits SET status='ACTIVE',started_at=COALESCE(started_at,NOW()),updated_at=NOW() WHERE id=:chit`,{replacements:{chit:chitId},transaction});return{success:true,data:{chitId,currentMonthNumber:monthNumber,chitStatus:'ACTIVE',message:`Running chit activated. Month ${monthNumber} is now a normal LIVE month.`}};});}
}
@Module({controllers:[RunningChitOnboardingController]}) export class RunningChitOnboardingModule{}
