import { Body, Controller, Param, Post, UseGuards, BadRequestException, ConflictException, NotFoundException, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsDecimal, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class RunningMemberDto {
  @ApiPropertyOptional({ description: 'Existing application user UUID. Either userId or mobile is required.' })
  @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional({ description: 'Existing application user mobile number. Either mobile or userId is required.' })
  @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) sequence?: number;
}

class RunningPayoutComponentDto {
  @ApiProperty() @IsDecimal() amount!: string;
  @ApiProperty({ enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'] }) @IsIn(['CASH','UPI','BANK_TRANSFER','OTHER']) method!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class HistoricalPaymentDto {
  @ApiProperty() @IsString() memberId!: string;
  @ApiProperty() @IsDecimal() amount!: string;
  @ApiProperty({ enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'] }) @IsIn(['CASH','UPI','BANK_TRANSFER','OTHER']) method!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class FinalizeHistoricalMonthDto {
  @ApiProperty() @IsDecimal() contributionPerMember!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDecimal() openingSavings?: string;
  @ApiProperty() @IsDecimal() closingSavings!: string;
  @ApiProperty() @IsDecimal() collectedAmount!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() winnerMemberId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() winnerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() winnerMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsDecimal() payoutAmount?: string;
  @ApiPropertyOptional() @IsOptional() @IsDecimal() discountAmount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() winnerReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [RunningPayoutComponentDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RunningPayoutComponentDto)
  payoutComponents?: RunningPayoutComponentDto[];
  @ApiProperty({ type: [HistoricalPaymentDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => HistoricalPaymentDto)
  payments!: HistoricalPaymentDto[];
}

class CreateRunningChitDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ['FIXED_DRAW', 'AUCTION'] }) @IsIn(['FIXED_DRAW','AUCTION']) chitType!: string;
  @ApiProperty() @IsInt() @Min(2) totalMembers!: number;
  @ApiProperty() @IsInt() @Min(2) totalMonths!: number;
  @ApiProperty({ description: 'Number of months already completed outside the app. The next month becomes the takeover/live month.' })
  @IsInt() @Min(1) historicalMonthCount!: number;
  @ApiProperty() @IsDateString() originalStartDate!: string;
  @ApiProperty() @IsInt() @Min(1) dueDay!: number;
  @ApiProperty() @IsDecimal() totalChitAmount!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() creatorParticipates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() agentId?: string;
  @ApiProperty({ type: [RunningMemberDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => RunningMemberDto)
  members!: RunningMemberDto[];
  @ApiPropertyOptional({ type: [String], description: 'Per-member monthly contribution. If omitted, totalChitAmount / totalMembers is used for every month.' })
  @IsOptional() @IsArray() @IsDecimal({}, { each: true }) monthlyAmounts?: string[];
  @ApiPropertyOptional({ type: [String], description: 'Fixed draw payout for each month. For auction months this is only a planning amount.' })
  @IsOptional() @IsArray() @IsDecimal({}, { each: true }) payoutAmounts?: string[];
}

@ApiTags('Running Chit Onboarding')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'running-chit-onboarding', version: '1' })
export class RunningChitOnboardingController {
  constructor(private readonly db: Sequelize) {}

  private async resolveUserId(input: RunningMemberDto, tx: any) {
    if (input.userId) {
      const [rows]: any = await this.db.query(`SELECT id FROM users WHERE id=:id LIMIT 1`, { replacements: { id: input.userId }, transaction: tx });
      if (!rows.length) throw new NotFoundException(`Member user ${input.userId} not found`);
      return rows[0].id;
    }
    if (input.mobile) {
      const [rows]: any = await this.db.query(`SELECT id FROM users WHERE mobile_number=:mobile LIMIT 1`, { replacements: { mobile: input.mobile }, transaction: tx });
      if (!rows.length) throw new NotFoundException(`Member with mobile ${input.mobile} not found. Create the user first.`);
      return rows[0].id;
    }
    throw new BadRequestException('Each running-chit member requires userId or mobile');
  }

  private async canManage(chitId: string, userId: string, tx?: any) {
    const [rows]: any = await this.db.query(`SELECT 1 FROM chits c WHERE c.id=:chitId AND (c.creator_id=:userId OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN')) LIMIT 1`, { replacements: { chitId, userId }, transaction: tx });
    return rows.length > 0;
  }

  @Post()
  @ApiOperation({ summary: 'Create a chit from an externally running/traditional chit and generate its complete schedule' })
  async create(@Body() dto: CreateRunningChitDto, @CurrentUser() u: any) {
    return this.db.transaction(async transaction => {
      if (dto.members.length !== dto.totalMembers) throw new BadRequestException(`Exactly ${dto.totalMembers} members are required`);
      if (dto.historicalMonthCount < 1 || dto.historicalMonthCount >= dto.totalMonths) throw new BadRequestException('historicalMonthCount must be between 1 and totalMonths - 1');
      if (new Set(dto.members.map(m => m.userId || `mobile:${m.mobile}`)).size !== dto.members.length) throw new BadRequestException('Duplicate running-chit members are not allowed');
      const amounts = dto.monthlyAmounts?.length ? dto.monthlyAmounts.map(Number) : Array(dto.totalMonths).fill(Number(dto.totalChitAmount) / dto.totalMembers);
      const payouts = dto.payoutAmounts?.length ? dto.payoutAmounts.map(Number) : amounts.map((x: number) => x * dto.totalMembers);
      if (amounts.length !== dto.totalMonths) throw new BadRequestException('monthlyAmounts must match totalMonths');
      if (payouts.length !== dto.totalMonths) throw new BadRequestException('payoutAmounts must match totalMonths');
      if (amounts.some(x => !Number.isFinite(x) || x <= 0)) throw new BadRequestException('All monthly contributions must be positive');
      if (payouts.some(x => !Number.isFinite(x) || x <= 0)) throw new BadRequestException('All monthly payout amounts must be positive');
      const face = Number(dto.totalChitAmount);
      if (!Number.isFinite(face) || face <= 0) throw new BadRequestException('totalChitAmount must be positive');

      let agentId: string | null = null;
      if (dto.agentId) {
        const [rows]: any = await this.db.query(`SELECT id FROM agents WHERE (id=:id OR user_id=:id) AND status='ACTIVE' LIMIT 1`, { replacements: { id: dto.agentId }, transaction });
        if (!rows.length) throw new NotFoundException('Active responsible agent not found');
        agentId = rows[0].id;
      } else {
        const [rows]: any = await this.db.query(`SELECT id FROM agents WHERE user_id=:u AND status='ACTIVE' LIMIT 1`, { replacements: { u: u.sub }, transaction });
        if (rows.length) agentId = rows[0].id;
      }

      const [chitRows]: any = await this.db.query(`INSERT INTO chits
        (id,creator_id,name,description,chit_type,status,total_members,total_months,total_chit_amount,
         accumulated_savings_amount,completed_months,start_date,due_day,creator_participates,collection_grace_days,
         agent_commission_mode,started_at,onboarding_mode,historical_month_count,created_at,updated_at)
        VALUES(gen_random_uuid(),:creator,:name,:description,:type,'DRAFT',:members,:months,:face,0,0,:start,:due,:creatorParticipates,7,
               :commissionMode,NULL,'RUNNING_CHIT',:historicalCount,NOW(),NOW()) RETURNING *`, {
          replacements: { creator: u.sub, name: dto.name.trim(), description: dto.description ?? null, type: dto.chitType,
            members: dto.totalMembers, months: dto.totalMonths, face, start: dto.originalStartDate,
            due: Math.min(28, Math.max(1, dto.dueDay)), creatorParticipates: dto.creatorParticipates === true,
            commissionMode: agentId ? 'PER_AGENT_MONTH' : 'NONE', historicalCount: dto.historicalMonthCount }, transaction });
      const chit = chitRows[0];

      for (let i = 0; i < dto.members.length; i += 1) {
        const memberUserId = await this.resolveUserId(dto.members[i], transaction);
        if (dto.creatorParticipates && memberUserId === u.sub) continue;
        await this.db.query(`INSERT INTO chit_participants
          (id,chit_id,user_id,participation_role,status,joined_at,accepted_at,participant_sequence,notes,created_at,updated_at)
          VALUES(gen_random_uuid(),:chit,:user,'PARTICIPANT','ACTIVE',:joined,:joined,:seq,'Running chit onboarding member',NOW(),NOW())`, {
            replacements: { chit: chit.id, user: memberUserId, joined: dto.originalStartDate, seq: dto.members[i].sequence ?? i + 1 }, transaction });
      }
      if (dto.creatorParticipates) {
        const [exists]: any = await this.db.query(`SELECT 1 FROM chit_participants WHERE chit_id=:chit AND user_id=:user LIMIT 1`, { replacements: { chit: chit.id, user: u.sub }, transaction });
        if (!exists.length) {
          await this.db.query(`INSERT INTO chit_participants
            (id,chit_id,user_id,participation_role,status,joined_at,accepted_at,participant_sequence,notes,created_at,updated_at)
            VALUES(gen_random_uuid(),:chit,:user,'PARTICIPANT','ACTIVE',:joined,:joined,:seq,'Creator participating in running chit',NOW(),NOW())`, {
              replacements: { chit: chit.id, user: u.sub, joined: dto.originalStartDate, seq: dto.members.length }, transaction });
        }
      }
      if (agentId) {
        await this.db.query(`INSERT INTO chit_agent_assignments
          (chit_id,agent_id,can_view_members,can_collect_cash,can_verify_payments,can_manage_chat,can_run_draw,can_run_auction,can_manage_chit,assigned_by,active)
          VALUES(:chit,:agent,true,true,true,true,true,true,true,:actor,true)
          ON CONFLICT(chit_id,agent_id) DO UPDATE SET active=true,can_view_members=true,can_collect_cash=true,can_verify_payments=true,can_manage_chat=true,can_run_draw=true,can_run_auction=true,can_manage_chit=true`,
          { replacements: { chit: chit.id, agent: agentId, actor: u.sub }, transaction });
      }
      for (let i = 0; i < dto.totalMonths; i += 1) {
        const month = i + 1;
        const date = new Date(dto.originalStartDate);
        date.setMonth(date.getMonth() + i); date.setDate(Math.min(28, Math.max(1, dto.dueDay)));
        await this.db.query(`INSERT INTO chit_months
          (id,chit_id,month_number,scheduled_date,scheduled_amount,winner_payout_amount,month_type,status,agent_id,created_at,updated_at)
          VALUES(gen_random_uuid(),:chit,:number,:date,:amount,:payout,'ACTION','SCHEDULED',:agent,NOW(),NOW())`, {
            replacements: { chit: chit.id, number: month, date: date.toISOString().slice(0,10), amount: amounts[i], payout: payouts[i], agent: null }, transaction });
      }
      return { success: true, data: { ...chit, onboardingMode: 'RUNNING_CHIT', historicalMonthsToFinalize: dto.historicalMonthCount, nextMonth: dto.historicalMonthCount + 1 } };
    });
  }

  @Post(':chitId/months/:monthNumber/finalize')
  @ApiOperation({ summary: 'Enter and permanently lock one historical month without running live member/draw/auction/payout workflows' })
  async finalize(@Param('chitId') chitId: string, @Param('monthNumber') monthNumberRaw: string, @Body() dto: FinalizeHistoricalMonthDto, @CurrentUser() u: any) {
    const monthNumber = Number(monthNumberRaw);
    if (!Number.isInteger(monthNumber) || monthNumber < 1) throw new BadRequestException('Invalid month number');
    return this.db.transaction(async transaction => {
      if (!(await this.canManage(chitId, u.sub, transaction))) throw new NotFoundException('Running chit not found');
      const [chits]: any = await this.db.query(`SELECT * FROM chits WHERE id=:id FOR UPDATE`, { replacements: { id: chitId }, transaction });
      const chit = chits[0];
      const [months]: any = await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:chit AND month_number=:month FOR UPDATE`, { replacements: { chit: chitId, month: monthNumber }, transaction });
      if (!months.length) throw new NotFoundException(`Month ${monthNumber} not found`);
      const month = months[0];
      if (String(month.data_origin || 'LIVE') === 'HISTORICAL' || String(month.status) === 'LOCKED') throw new ConflictException(`Month ${monthNumber} is already finalized and locked`);
      const targetHistorical = Number(chit.historical_month_count || 0);
      if (targetHistorical < 1) throw new ConflictException('Running chit historical month count is not configured');
      if (monthNumber > targetHistorical) throw new ConflictException(`Month ${monthNumber} is not a historical month. Takeover starts at Month ${targetHistorical + 1}.`);
      if (monthNumber > Number(chit.total_months)) throw new BadRequestException('Month is outside the chit duration');
      if (monthNumber > Number(chit.completed_months || 0) + 1) throw new ConflictException(`Finalize historical months in order. Month ${Number(chit.completed_months || 0) + 1} must be finalized first.`);

      const participantRows: any = await this.db.query(`SELECT cp.id,cp.user_id,u.mobile_number FROM chit_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.chit_id=:chit AND cp.status='ACTIVE' ORDER BY cp.participant_sequence`, { replacements: { chit: chitId }, transaction });
      const participants = participantRows[0];
      if (!participants.length) throw new ConflictException('Running chit has no active participants');
      const resolveMemberId = (value: string) => {
        const hit = participants.find((x: any) => String(x.user_id) === String(value) || (x.mobile_number && String(x.mobile_number) === String(value)));
        return hit?.user_id || null;
      };
      const expected = Number(dto.contributionPerMember) * participants.length;
      const collected = Number(dto.collectedAmount);
      const payout = Number(dto.payoutAmount || 0);
      const opening = monthNumber === 1 ? 0 : Number(dto.openingSavings);
      const closing = Number(dto.closingSavings);
      if (!Number.isFinite(expected) || expected < 0) throw new BadRequestException('Invalid contribution amount');
      if (!Number.isFinite(collected) || collected < 0) throw new BadRequestException('Invalid collected amount');
      if (!Number.isFinite(closing) || closing < 0) throw new BadRequestException('Closing savings cannot be negative');
      if (monthNumber > 1 && (!Number.isFinite(opening) || opening < 0)) throw new BadRequestException('Opening savings is required after Month 1');
      if (monthNumber === 1 && Math.abs(opening) > 0.01) throw new BadRequestException('Month 1 opening savings must be zero');
      if (monthNumber > 1 && Math.abs(opening - Number(chit.accumulated_savings_amount || 0)) > 0.01) throw new BadRequestException(`Opening savings must equal the previous finalized closing savings (${Number(chit.accumulated_savings_amount || 0).toFixed(2)})`);
      if (collected > expected + 0.01) throw new BadRequestException(`Collected amount cannot exceed scheduled contribution total ${expected.toFixed(2)}`);
      if (payout < 0) throw new BadRequestException('Payout cannot be negative');
      if (payout > opening + collected + 0.01) throw new BadRequestException('Historical payout cannot exceed available funds');
      if (Math.abs(closing - (opening + collected - payout)) > 0.01) throw new BadRequestException('Closing savings must equal opening + collected - payout');
      const memberIds = new Set(participants.map((p: any) => String(p.user_id)));
      const normalizedPayments = dto.payments.map(p => ({ ...p, memberId: resolveMemberId(p.memberId) || p.memberId }));
      const paymentTotal = normalizedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (Math.abs(paymentTotal - collected) > 0.01) throw new BadRequestException(`Historical payment rows (${paymentTotal.toFixed(2)}) must equal collectedAmount (${collected.toFixed(2)})`);
      for (const p of normalizedPayments) {
        if (!memberIds.has(String(p.memberId))) throw new BadRequestException(`Historical payment references non-member ${p.memberId}`);
        if (!Number.isFinite(Number(p.amount)) || Number(p.amount) <= 0) throw new BadRequestException('Historical payment amounts must be positive');
      }
      const winnerUserId = dto.winnerMemberId ? resolveMemberId(dto.winnerMemberId) : null;
      if (dto.winnerMemberId && !winnerUserId) throw new BadRequestException('Winner must match an existing member UUID or mobile number');
      const components = dto.payoutComponents || [];
      const componentTotal = components.reduce((sum, p) => sum + Number(p.amount), 0);
      if (components.length && Math.abs(componentTotal - payout) > 0.01) throw new BadRequestException('Payout components must equal payout amount');

      const historicalData = { dataOrigin:'HISTORICAL', finalizedBy:u.sub, finalizedAt:new Date().toISOString(), completedAt:dto.completedAt||null,
        contributionPerMember:Number(dto.contributionPerMember), expectedCollection:expected, collectedAmount:collected,
        openingSavings:opening, closingSavings:closing, winnerMemberId:winnerUserId||null, winnerName:dto.winnerName||null,
        winnerMobile:dto.winnerMobile||null, payoutAmount:payout, discountAmount:dto.discountAmount!=null?Number(dto.discountAmount):null,
        winnerReference:dto.winnerReference||null, payoutComponents:components, notes:dto.notes||null };

      await this.db.query(`UPDATE chit_months SET data_origin='HISTORICAL',status='LOCKED',locked_at=NOW(),locked_by=:actor,historical_data=:data::jsonb,updated_at=NOW() WHERE id=:id`, { replacements: { id:month.id, actor:u.sub, data:JSON.stringify(historicalData) }, transaction });

      for (const participant of participants) {
        const [existingObligation]: any = await this.db.query(`SELECT id FROM contribution_obligations WHERE chit_month_id=:month AND chit_participant_id=:participant LIMIT 1 FOR UPDATE`, { replacements: { month:month.id, participant:participant.id }, transaction });
        if (!existingObligation.length) {
          await this.db.query(`INSERT INTO contribution_obligations
            (id,chit_month_id,chit_participant_id,due_amount,paid_amount,outstanding_amount,status,due_date,created_at,updated_at)
            VALUES(gen_random_uuid(),:month,:participant,:due,0,:due,'PENDING',:dueDate,NOW(),NOW())`, { replacements: { month:month.id, participant:participant.id, due:Number(dto.contributionPerMember), dueDate:month.scheduled_date }, transaction });
        }
      }

      for (const p of normalizedPayments) {
        const participant = participants.find((x: any) => String(x.user_id) === String(p.memberId));
        const [obs]: any = await this.db.query(`SELECT * FROM contribution_obligations WHERE chit_month_id=:month AND chit_participant_id=:participant LIMIT 1 FOR UPDATE`, { replacements: { month:month.id, participant:participant.id }, transaction });
        let obligation = obs[0];
        if (!obligation) {
          const [created]: any = await this.db.query(`INSERT INTO contribution_obligations
            (id,chit_month_id,chit_participant_id,due_amount,paid_amount,outstanding_amount,status,due_date,created_at,updated_at)
            VALUES(gen_random_uuid(),:month,:participant,:due,0,:due,'PENDING',:dueDate,NOW(),NOW()) RETURNING *`, { replacements: { month:month.id, participant:participant.id, due:Number(dto.contributionPerMember), dueDate:month.scheduled_date }, transaction });
          obligation = created[0];
        }
        await this.db.query(`INSERT INTO payments
          (id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,payment_method,status,transaction_reference,payment_date,submitted_at,verified_at,recorded_by,verified_by,notes,receipt_number,created_at,updated_at)
          VALUES(gen_random_uuid(),:chit,:month,:participant,:obligation,:amount,:method,'VERIFIED',:reference,COALESCE(:paymentDate,:scheduledDate),COALESCE(:paymentDate,:scheduledDate),COALESCE(:paymentDate,:scheduledDate),:actor,:actor,:notes,:receipt,NOW(),NOW())`, { replacements: { chit:chitId, month:month.id, participant:participant.id, obligation:obligation.id, amount:Number(p.amount), method:p.method, reference:p.reference||null, paymentDate:p.paymentDate||null, scheduledDate:month.scheduled_date, actor:u.sub, notes:p.notes||'Historical running-chit entry', receipt:p.reference||null }, transaction });
        await this.db.query(`UPDATE contribution_obligations SET paid_amount=LEAST(due_amount,COALESCE(paid_amount,0)+:amount),outstanding_amount=GREATEST(0,due_amount-(COALESCE(paid_amount,0)+:amount)),status=CASE WHEN GREATEST(0,due_amount-(COALESCE(paid_amount,0)+:amount))=0 THEN 'PAID' ELSE 'PARTIAL' END,updated_at=NOW() WHERE id=:id`, { replacements: { amount:Number(p.amount), id:obligation.id }, transaction });
      }

      if (payout > 0) {
        const [existing]: any = await this.db.query(`SELECT id FROM payouts WHERE chit_month_id=:month AND status='SETTLED' LIMIT 1`, { replacements: { month:month.id }, transaction });
        if (!existing.length) {
          const parentMethod = components.length === 1 ? components[0].method : components.length > 1 ? 'SPLIT' : 'HISTORICAL';
          const parentRef = components.length ? components.map(x => `${x.method}:${x.reference || 'NO-REF'}`).join(' | ') : (dto.winnerReference || null);
          const [payoutRows]: any = await this.db.query(`INSERT INTO payouts
            (id,chit_id,chit_month_id,payout_calculation_id,recipient_user_id,amount,payment_method,status,transaction_reference,paid_at,recorded_by,verified_by,receipt_number,notes,created_at,updated_at)
            VALUES(gen_random_uuid(),:chit,:month,NULL,:recipient,:amount,:method,'SETTLED',:reference,COALESCE(:paidAt,NOW()),:actor,:actor,:receipt,:notes,NOW(),NOW()) RETURNING id`, { replacements: { chit:chitId, month:month.id, recipient:winnerUserId||null, amount:payout, method:parentMethod, reference:parentRef, paidAt:dto.completedAt||null, actor:u.sub, receipt:dto.winnerReference||null, notes:dto.notes||'Historical running-chit payout' }, transaction });
          const payoutId = payoutRows[0].id;
          for (const c of components) await this.db.query(`INSERT INTO payout_transactions
            (id,payout_id,amount,payment_method,transaction_reference,status,paid_at,recorded_by,notes,created_at,updated_at)
            VALUES(gen_random_uuid(),:payout,:amount,:method,:reference,'SETTLED',COALESCE(:paidAt,NOW()),:actor,:notes,NOW(),NOW())`, { replacements: { payout:payoutId, amount:Number(c.amount), method:c.method, reference:c.reference||null, paidAt:dto.completedAt||null, actor:u.sub, notes:c.notes||'Historical payout component' }, transaction });
          if (winnerUserId) await this.db.query(`INSERT INTO ledger_entries
            (id,chit_id,chit_month_id,chit_participant_id,entry_type,amount,description,reference_type,reference_id,created_by,created_at,updated_at)
            SELECT gen_random_uuid(),:chit,:month,id,'PAYOUT',-:amount,'Historical running-chit payout','PAYOUT',:payout,:actor,NOW(),NOW()
            FROM chit_participants WHERE chit_id=:chit AND user_id=:recipient`, { replacements: { chit:chitId, month:month.id, amount:payout, payout:payoutId, actor:u.sub, recipient:winnerUserId }, transaction });
        }
      }
      await this.db.query(`UPDATE chits SET accumulated_savings_amount=:closing,completed_months=:completed,updated_at=NOW() WHERE id=:chit`, { replacements: { closing, completed:monthNumber, chit:chitId }, transaction });
      return { success:true, data:{ chitId, monthNumber, status:'LOCKED', dataOrigin:'HISTORICAL', closingSavings:closing, message:`Month ${monthNumber} finalized and locked. No live member/draw/auction/payout workflow was executed.` } };
    });
  }

  @Post(':chitId/activate/:monthNumber')
  @ApiOperation({ summary: 'Activate the first live month after historical onboarding is complete' })
  async activate(@Param('chitId') chitId: string, @Param('monthNumber') monthRaw: string, @CurrentUser() u: any) {
    const monthNumber = Number(monthRaw);
    return this.db.transaction(async transaction => {
      if (!(await this.canManage(chitId, u.sub, transaction))) throw new NotFoundException('Running chit not found');
      const [chits]: any = await this.db.query(`SELECT * FROM chits WHERE id=:id FOR UPDATE`, { replacements: { id:chitId }, transaction });
      if (!chits.length) throw new NotFoundException('Running chit not found');
      const chit = chits[0];
      const completed = Number(chit.completed_months || 0);
      const targetHistorical = Number(chit.historical_month_count || 0);
      if (monthNumber !== targetHistorical + 1) throw new ConflictException(`Month ${targetHistorical + 1} is the configured takeover month`);
      if (completed !== targetHistorical) throw new ConflictException(`Finalize all ${targetHistorical} historical month(s) before activation`);
      const [months]: any = await this.db.query(`SELECT * FROM chit_months WHERE chit_id=:chit AND month_number=:month FOR UPDATE`, { replacements: { chit:chitId, month:monthNumber }, transaction });
      if (!months.length) throw new NotFoundException(`Month ${monthNumber} not found`);
      if (monthNumber > Number(chit.total_months)) throw new BadRequestException('No remaining live month');
      await this.db.query(`SELECT 1 FROM chit_months WHERE chit_id=:chit AND month_number<:month AND COALESCE(data_origin,'LIVE')<>'HISTORICAL' LIMIT 1`, { replacements: { chit:chitId, month:monthNumber }, transaction });
      await this.db.query(`UPDATE chit_months SET status=CASE WHEN month_number=:month THEN 'ACTIVE' WHEN month_number<:month THEN 'LOCKED' ELSE status END,updated_at=NOW() WHERE chit_id=:chit`, { replacements: { chit:chitId, month:monthNumber }, transaction });
      await this.db.query(`UPDATE chit_months SET data_origin='LIVE' WHERE chit_id=:chit AND month_number=:month`, { replacements: { chit:chitId, month:monthNumber }, transaction });
      await this.db.query(`UPDATE chits SET status='ACTIVE',started_at=COALESCE(started_at,NOW()),updated_at=NOW() WHERE id=:chit`, { replacements: { chit:chitId }, transaction });
      return { success:true, data:{ chitId, currentMonthNumber:monthNumber, chitStatus:'ACTIVE', message:`Running chit activated. Month ${monthNumber} is now a normal LIVE month.` } };
    });
  }
}

@Module({ controllers:[RunningChitOnboardingController] })
export class RunningChitOnboardingModule {}
