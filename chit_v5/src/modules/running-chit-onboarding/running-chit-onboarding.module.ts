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
  @ApiProperty({ description: 'Legacy field retained for compatibility; backend now derives this from contributionPerMember × active members.' })
  @IsDecimal() collectedAmount!: string;
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
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsDecimal({}, { each: true }) monthlyAmounts?: string[];
  @ApiPropertyOptional({ type: [String] })
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
      const [rows]: any = await this.db.query(
        `SELECT id FROM users WHERE id=:id LIMIT 1`,
        { replacements: { id: input.userId }, transaction: tx },
      );
      if (!rows.length) throw new NotFoundException(`Member user ${input.userId} not found`);
      return rows[0].id;
    }
    if (input.mobile) {
      const [rows]: any = await this.db.query(
        `SELECT id FROM users WHERE mobile_number=:mobile LIMIT 1`,
        { replacements: { mobile: input.mobile }, transaction: tx },
      );
      if (!rows.length) {
        throw new NotFoundException(
          `Member with mobile ${input.mobile} not found. Create the user first.`,
        );
      }
      return rows[0].id;
    }
    throw new BadRequestException('Each running-chit member requires userId or mobile');
  }

  private async canManage(chitId: string, userId: string, tx?: any) {
    const [rows]: any = await this.db.query(
      `SELECT 1 FROM chits c
       WHERE c.id=:chitId
         AND (
           c.creator_id=:userId
           OR EXISTS (
             SELECT 1 FROM user_roles ur
             WHERE ur.user_id=:userId AND ur.role='ADMIN'
           )
         )
       LIMIT 1`,
      { replacements: { chitId, userId }, transaction: tx },
    );
    return rows.length > 0;
  }

  private monthType(chitType: string, month: any) {
    const value = String(month.month_type || '').toUpperCase();
    if (value === 'AGENT_CHIT') return 'AGENT_CHIT';
    return String(chitType).toUpperCase() === 'AUCTION' ? 'AUCTION' : 'FIXED_DRAW';
  }

  @Post()
  @ApiOperation({ summary: 'Create a chit from an externally running/traditional chit and generate its complete schedule' })
  async create(@Body() dto: CreateRunningChitDto, @CurrentUser() u: any) {
    return this.db.transaction(async transaction => {
      if (dto.members.length !== dto.totalMembers) {
        throw new BadRequestException(`Exactly ${dto.totalMembers} members are required`);
      }
      if (
        dto.historicalMonthCount < 1 ||
        dto.historicalMonthCount >= dto.totalMonths
      ) {
        throw new BadRequestException(
          'historicalMonthCount must be between 1 and totalMonths - 1',
        );
      }

      if (
        new Set(
          dto.members.map(m => m.userId || `mobile:${m.mobile}`),
        ).size !== dto.members.length
      ) {
        throw new BadRequestException('Duplicate running-chit members are not allowed');
      }

      const face = Number(dto.totalChitAmount);
      if (!Number.isFinite(face) || face <= 0) {
        throw new BadRequestException('totalChitAmount must be positive');
      }

      const monthlyContribution = face / dto.totalMembers;
      const amounts = dto.monthlyAmounts?.length
        ? dto.monthlyAmounts.map(Number)
        : Array(dto.totalMonths).fill(monthlyContribution);

      if (amounts.length !== dto.totalMonths) {
        throw new BadRequestException('monthlyAmounts must match totalMonths');
      }
      if (amounts.some(x => !Number.isFinite(x) || x <= 0)) {
        throw new BadRequestException('All monthly contributions must be positive');
      }

      let agentId: string | null = null;
      if (dto.agentId) {
        const [rows]: any = await this.db.query(
          `SELECT id
           FROM agents
           WHERE (id=:id OR user_id=:id) AND status='ACTIVE'
           LIMIT 1`,
          { replacements: { id: dto.agentId }, transaction },
        );
        if (!rows.length) throw new NotFoundException('Active responsible agent not found');
        agentId = rows[0].id;
      } else {
        const [rows]: any = await this.db.query(
          `SELECT id FROM agents
           WHERE user_id=:u AND status='ACTIVE'
           LIMIT 1`,
          { replacements: { u: u.sub }, transaction },
        );
        if (rows.length) agentId = rows[0].id;
      }

      const [chitRows]: any = await this.db.query(
        `INSERT INTO chits
         (id,creator_id,name,description,chit_type,status,total_members,total_months,total_chit_amount,
          accumulated_savings_amount,completed_months,start_date,due_day,creator_participates,collection_grace_days,
          agent_commission_mode,started_at,onboarding_mode,historical_month_count,created_at,updated_at)
         VALUES(
          gen_random_uuid(),:creator,:name,:description,:type,'DRAFT',:members,:months,:face,
          0,0,:start,:due,:creatorParticipates,7,:commissionMode,NULL,
          'RUNNING_CHIT',:historicalCount,NOW(),NOW()
         )
         RETURNING *`,
        {
          replacements: {
            creator: u.sub,
            name: dto.name.trim(),
            description: dto.description ?? null,
            type: dto.chitType,
            members: dto.totalMembers,
            months: dto.totalMonths,
            face,
            start: dto.originalStartDate,
            due: Math.min(28, Math.max(1, dto.dueDay)),
            creatorParticipates: dto.creatorParticipates === true,
            commissionMode: agentId ? 'PER_AGENT_MONTH' : 'NONE',
            historicalCount: dto.historicalMonthCount,
          },
          transaction,
        },
      );
      const chit = chitRows[0];

      for (let i = 0; i < dto.members.length; i += 1) {
        const memberUserId = await this.resolveUserId(dto.members[i], transaction);
        if (dto.creatorParticipates && memberUserId === u.sub) continue;

        await this.db.query(
          `INSERT INTO chit_participants
           (id,chit_id,user_id,participation_role,status,joined_at,accepted_at,
            participant_sequence,notes,created_at,updated_at)
           VALUES(
            gen_random_uuid(),:chit,:user,'PARTICIPANT','ACTIVE',:joined,:joined,:seq,
            'Running chit onboarding member',NOW(),NOW()
           )`,
          {
            replacements: {
              chit: chit.id,
              user: memberUserId,
              joined: dto.originalStartDate,
              seq: dto.members[i].sequence ?? i + 1,
            },
            transaction,
          },
        );
      }

      if (dto.creatorParticipates) {
        const [exists]: any = await this.db.query(
          `SELECT 1 FROM chit_participants
           WHERE chit_id=:chit AND user_id=:user LIMIT 1`,
          { replacements: { chit: chit.id, user: u.sub }, transaction },
        );
        if (!exists.length) {
          await this.db.query(
            `INSERT INTO chit_participants
             (id,chit_id,user_id,participation_role,status,joined_at,accepted_at,
              participant_sequence,notes,created_at,updated_at)
             VALUES(
              gen_random_uuid(),:chit,:user,'PARTICIPANT','ACTIVE',:joined,:joined,:seq,
              'Creator participating in running chit',NOW(),NOW()
             )`,
            {
              replacements: {
                chit: chit.id,
                user: u.sub,
                joined: dto.originalStartDate,
                seq: dto.members.length,
              },
              transaction,
            },
          );
        }
      }

      if (agentId) {
        await this.db.query(
          `INSERT INTO chit_agent_assignments
           (chit_id,agent_id,can_view_members,can_collect_cash,can_verify_payments,
            can_manage_chat,can_run_draw,can_run_auction,can_manage_chit,assigned_by,active)
           VALUES(
            :chit,:agent,true,true,true,true,true,true,true,:actor,true
           )
           ON CONFLICT(chit_id,agent_id) DO UPDATE SET
            active=true,
            can_view_members=true,
            can_collect_cash=true,
            can_verify_payments=true,
            can_manage_chat=true,
            can_run_draw=true,
            can_run_auction=true,
            can_manage_chit=true`,
          {
            replacements: { chit: chit.id, agent: agentId, actor: u.sub },
            transaction,
          },
        );
      }

      // Generate the complete schedule. Historical months start as SCHEDULED
      // records and are materialized/locked only through the historical finalize action.
      for (let i = 0; i < dto.totalMonths; i += 1) {
        const month = i + 1;
        const date = new Date(dto.originalStartDate);
        date.setMonth(date.getMonth() + i);
        date.setDate(Math.min(28, Math.max(1, dto.dueDay)));

        const amount = amounts[i];
        const plannedPayout =
          String(dto.chitType).toUpperCase() === 'FIXED_DRAW'
            ? face
            : null;

        await this.db.query(
          `INSERT INTO chit_months
           (id,chit_id,month_number,scheduled_date,scheduled_amount,
            winner_payout_amount,month_type,status,agent_id,created_at,updated_at)
           VALUES(
            gen_random_uuid(),:chit,:number,:date,:amount,:payout,
            'ACTION','SCHEDULED',NULL,NOW(),NOW()
           )`,
          {
            replacements: {
              chit: chit.id,
              number: month,
              date: date.toISOString().slice(0, 10),
              amount,
              payout: plannedPayout,
            },
            transaction,
          },
        );
      }

      return {
        success: true,
        data: {
          ...chit,
          onboardingMode: 'RUNNING_CHIT',
          historicalMonthsToFinalize: dto.historicalMonthCount,
          nextMonth: dto.historicalMonthCount + 1,
        },
      };
    });
  }

  @Post(':chitId/months/:monthNumber/finalize')
  @ApiOperation({
    summary:
      'Enter and permanently lock one historical month without running live member/draw/auction/payout workflows',
  })
  async finalize(
    @Param('chitId') chitId: string,
    @Param('monthNumber') monthNumberRaw: string,
    @Body() dto: FinalizeHistoricalMonthDto,
    @CurrentUser() u: any,
  ) {
    const monthNumber = Number(monthNumberRaw);
    if (!Number.isInteger(monthNumber) || monthNumber < 1) {
      throw new BadRequestException('Invalid month number');
    }

    return this.db.transaction(async transaction => {
      if (!(await this.canManage(chitId, u.sub, transaction))) {
        throw new NotFoundException('Running chit not found');
      }

      const [chits]: any = await this.db.query(
        `SELECT * FROM chits WHERE id=:id FOR UPDATE`,
        { replacements: { id: chitId }, transaction },
      );
      if (!chits.length) throw new NotFoundException('Running chit not found');

      const chit = chits[0];

      const [months]: any = await this.db.query(
        `SELECT * FROM chit_months
         WHERE chit_id=:chit AND month_number=:month
         FOR UPDATE`,
        { replacements: { chit: chitId, month: monthNumber }, transaction },
      );
      if (!months.length) {
        throw new NotFoundException(`Month ${monthNumber} not found`);
      }

      const month = months[0];
      const status = String(month.status || '').toUpperCase();
      if (
        String(month.data_origin || 'LIVE').toUpperCase() === 'HISTORICAL' ||
        status === 'LOCKED'
      ) {
        throw new ConflictException(
          `Month ${monthNumber} is already finalized and locked`,
        );
      }

      const targetHistorical = Number(chit.historical_month_count || 0);
      if (targetHistorical < 1) {
        throw new ConflictException(
          'Running chit historical month count is not configured',
        );
      }
      if (monthNumber > targetHistorical) {
        throw new ConflictException(
          `Month ${monthNumber} is not a historical month. Takeover starts at Month ${targetHistorical + 1}.`,
        );
      }
      if (monthNumber > Number(chit.total_months)) {
        throw new BadRequestException('Month is outside the chit duration');
      }

      const expectedSequence = Number(chit.completed_months || 0) + 1;
      if (monthNumber !== expectedSequence) {
        throw new ConflictException(
          `Finalize historical months in order. Month ${expectedSequence} must be finalized first.`,
        );
      }

      const [participantRows]: any = await this.db.query(
        `SELECT cp.id,cp.user_id,u.mobile_number,cp.participant_sequence
         FROM chit_participants cp
         JOIN users u ON u.id=cp.user_id
         WHERE cp.chit_id=:chit AND cp.status='ACTIVE'
         ORDER BY cp.participant_sequence`,
        { replacements: { chit: chitId }, transaction },
      );
      const participants = participantRows;

      if (!participants.length) {
        throw new ConflictException('Running chit has no active participants');
      }

      const participantCount = participants.length;
      const contribution = Number(dto.contributionPerMember);
      const expected = contribution * participantCount;
      const opening = monthNumber === 1
        ? 0
        : Number(chit.accumulated_savings_amount || 0);

      if (!Number.isFinite(contribution) || contribution <= 0) {
        throw new BadRequestException('Contribution per member must be positive');
      }
      if (monthNumber > 1 && (!Number.isFinite(opening) || opening < 0)) {
        throw new BadRequestException('Opening savings could not be derived');
      }

      // Historical collections are always derived from contribution/member count.
      // The client supplied collectedAmount is accepted only as a compatibility
      // hint and must match the derived total.
      const suppliedCollected = Number(dto.collectedAmount);
      if (
        !Number.isFinite(suppliedCollected) ||
        Math.abs(suppliedCollected - expected) > 0.01
      ) {
        throw new BadRequestException(
          `Historical collected amount is derived as ${expected.toFixed(
            2,
          )} (${contribution.toFixed(2)} × ${participantCount} members).`,
        );
      }
      const collected = expected;

      const normalizedPayments = Array.isArray(dto.payments) ? dto.payments : [];
      const paymentByUser = new Map<string, any>();
      let paymentTotal = 0;

      const resolveMemberId = (value: string) => {
        const hit = participants.find(
          (x: any) =>
            String(x.user_id) === String(value) ||
            (x.mobile_number &&
              String(x.mobile_number) === String(value)),
        );
        return hit?.user_id || null;
      };

      for (const payment of normalizedPayments) {
        const memberId = resolveMemberId(payment.memberId);
        if (!memberId) {
          throw new BadRequestException(
            `Historical payment references non-member ${payment.memberId}`,
          );
        }

        const amount = Number(payment.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new BadRequestException(
            'Historical payment amounts must be positive',
          );
        }

        const method = String(payment.method || '').toUpperCase();
        if (!['CASH', 'UPI'].includes(method)) {
          throw new BadRequestException(
            'Historical payment method must be CASH or UPI',
          );
        }

        if (paymentByUser.has(memberId)) {
          throw new BadRequestException(
            `Duplicate historical payment row for member ${payment.memberId}`,
          );
        }

        paymentByUser.set(memberId, { ...payment, memberId, amount, method });
        paymentTotal += amount;
      }

      // Requirement: historical collection rows default to one monthly contribution
      // per member, with CASH as the default. To retain auditability, a payment row
      // may explicitly be supplied, but every active member must be represented.
      if (paymentByUser.size !== participantCount) {
        throw new BadRequestException(
          `Historical month requires one payment row for every active member (${participantCount} rows).`,
        );
      }

      if (Math.abs(paymentTotal - collected) > 0.01) {
        throw new BadRequestException(
          `Historical payment rows (${paymentTotal.toFixed(
            2,
          )}) must equal derived collected amount (${collected.toFixed(2)})`,
        );
      }

      for (const participant of participants) {
        const row = paymentByUser.get(String(participant.user_id));
        if (!row || Math.abs(row.amount - contribution) > 0.01) {
          throw new BadRequestException(
            `Historical payment for member ${participant.participant_sequence} must equal the monthly contribution ${contribution.toFixed(2)}.`,
          );
        }
      }

      const chitType = String(chit.chit_type || '').toUpperCase();
      const kind = this.monthType(chitType, month);

      const winnerUserId = dto.winnerMemberId
        ? resolveMemberId(dto.winnerMemberId)
        : null;

      if (dto.winnerMemberId && !winnerUserId) {
        throw new BadRequestException(
          'Winner must match an existing member UUID or mobile number',
        );
      }

      let discount = 0;
      let payout = 0;

      if (kind === 'FIXED_DRAW') {
        payout = faceAmount(chit);
        discount = 0;
      } else if (kind === 'AUCTION') {
        discount = Number(dto.discountAmount || 0);
        if (!Number.isFinite(discount) || discount < 0 || discount > Number(chit.total_chit_amount)) {
          throw new BadRequestException('Auction discount is invalid');
        }
        payout = Number(chit.total_chit_amount) - discount;
      } else {
        // AGENT_CHIT is only used by normal chits; running historical onboarding
        // does not execute an agent month, but keep the branch explicit.
        payout = Number(dto.payoutAmount || 0);
      }

      if (dto.payoutAmount != null && Math.abs(Number(dto.payoutAmount) - payout) > 0.01) {
        throw new BadRequestException(
          `Historical payout is derived as ${payout.toFixed(2)} for ${kind}.`,
        );
      }

      if (kind === 'FIXED_DRAW' && !winnerUserId && !dto.winnerName && !dto.winnerMobile) {
        throw new BadRequestException('Fixed Draw historical month requires a winner');
      }

      if (kind === 'AUCTION' && !winnerUserId && !dto.winnerName && !dto.winnerMobile) {
        throw new BadRequestException('Auction historical month requires a winner');
      }

      if (kind !== 'FIXED_DRAW' && kind !== 'AUCTION') {
        if (payout > opening + collected + 0.01) {
          throw new BadRequestException('Historical payout cannot exceed available funds');
        }
      } else if (payout > opening + collected + 0.01) {
        throw new BadRequestException('Historical payout cannot exceed available funds');
      }

      const closing = opening + collected - payout;
      if (closing < -0.01) {
        throw new BadRequestException('Historical closing savings cannot be negative');
      }

      const normalizedComponents =
        Array.isArray(dto.payoutComponents) && dto.payoutComponents.length
          ? dto.payoutComponents.map(c => ({
              amount: Number(c.amount),
              method: String(c.method || '').toUpperCase(),
              reference: c.reference || null,
              notes: c.notes || null,
            }))
          : [
              {
                amount: payout,
                method: 'CASH',
                reference: dto.winnerReference || null,
                notes: 'Historical payout default',
              },
            ];

      const componentTotal = normalizedComponents.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      if (payout > 0 && Math.abs(componentTotal - payout) > 0.01) {
        throw new BadRequestException(
          'Payout components must equal the derived payout amount',
        );
      }

      for (const c of normalizedComponents) {
        if (!Number.isFinite(c.amount) || c.amount <= 0) {
          throw new BadRequestException(
            'Historical payout component amounts must be positive',
          );
        }
        if (!['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'].includes(c.method)) {
          throw new BadRequestException('Invalid historical payout method');
        }
      }

      const historicalData = {
        dataOrigin: 'HISTORICAL',
        finalizedBy: u.sub,
        finalizedAt: new Date().toISOString(),
        completedAt: dto.completedAt || month.scheduled_date,
        contributionPerMember: contribution,
        expectedCollection: expected,
        collectedAmount: collected,
        openingSavings: opening,
        closingSavings: Math.max(0, closing),
        winnerMemberId: winnerUserId || null,
        winnerName: dto.winnerName || null,
        winnerMobile: dto.winnerMobile || null,
        payoutAmount: payout,
        discountAmount: kind === 'AUCTION' ? discount : 0,
        winnerReference: dto.winnerReference || null,
        payoutComponents: normalizedComponents,
        notes: dto.notes || null,
      };

      await this.db.query(
        `UPDATE chit_months
         SET data_origin='HISTORICAL',
             status='LOCKED',
             scheduled_amount=:contribution,
             winner_payout_amount=:payout,
             historical_data=:data::jsonb,
             locked_at=NOW(),
             locked_by=:actor,
             updated_at=NOW()
         WHERE id=:id`,
        {
          replacements: {
            id: month.id,
            actor: u.sub,
            contribution,
            payout,
            data: JSON.stringify(historicalData),
          },
          transaction,
        },
      );

      // Materialize exactly one verified historical contribution per member.
      for (const participant of participants) {
        const row = paymentByUser.get(String(participant.user_id));
        const [existingObligation]: any = await this.db.query(
          `SELECT id,paid_amount
           FROM contribution_obligations
           WHERE chit_month_id=:month AND chit_participant_id=:participant
           LIMIT 1
           FOR UPDATE`,
          {
            replacements: {
              month: month.id,
              participant: participant.id,
            },
            transaction,
          },
        );

        let obligation = existingObligation[0];
        if (!obligation) {
          const [created]: any = await this.db.query(
            `INSERT INTO contribution_obligations
             (id,chit_month_id,chit_participant_id,due_amount,paid_amount,
              outstanding_amount,status,due_date,created_at,updated_at)
             VALUES(
              gen_random_uuid(),:month,:participant,:due,:paid,0,'PAID',
              :dueDate,NOW(),NOW()
             )
             RETURNING *`,
            {
              replacements: {
                month: month.id,
                participant: participant.id,
                due: contribution,
                paid: contribution,
                dueDate: month.scheduled_date,
              },
              transaction,
            },
          );
          obligation = created[0];
        } else {
          const existingPaid = Number(obligation.paid_amount || 0);
          if (existingPaid > 0) {
            throw new ConflictException(
              `Historical obligation for member ${participant.participant_sequence} already has payment data`,
            );
          }
          await this.db.query(
            `UPDATE contribution_obligations
             SET due_amount=:due,
                 paid_amount=:paid,
                 outstanding_amount=0,
                 status='PAID',
                 due_date=:dueDate,
                 updated_at=NOW()
             WHERE id=:id`,
            {
              replacements: {
                id: obligation.id,
                due: contribution,
                paid: contribution,
                dueDate: month.scheduled_date,
              },
              transaction,
            },
          );
        }

        await this.db.query(
          `INSERT INTO payments
           (id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,
            payment_method,status,transaction_reference,payment_date,submitted_at,
            verified_at,recorded_by,verified_by,notes,receipt_number,created_at,updated_at)
           VALUES(
            gen_random_uuid(),:chit,:month,:participant,:obligation,:amount,
            :method,'VERIFIED',:reference,:paymentDate,:paymentDate,:paymentDate,
            :actor,:actor,:notes,:receipt,NOW(),NOW()
           )`,
          {
            replacements: {
              chit: chitId,
              month: month.id,
              participant: participant.id,
              obligation: obligation.id,
              amount: contribution,
              method: row.method,
              reference: row.reference || null,
              paymentDate: row.paymentDate || month.scheduled_date,
              actor: u.sub,
              notes: row.notes || 'Historical running-chit entry',
              receipt: row.reference || null,
            },
            transaction,
          },
        );
      }

      if (payout > 0) {
        const [existing]: any = await this.db.query(
          `SELECT id FROM payouts
           WHERE chit_month_id=:month AND status='SETTLED'
           LIMIT 1`,
          { replacements: { month: month.id }, transaction },
        );

        if (existing.length) {
          throw new ConflictException(
            `Historical payout for Month ${monthNumber} already exists`,
          );
        }

        const parentMethod =
          normalizedComponents.length === 1
            ? normalizedComponents[0].method
            : 'SPLIT';

        const parentRef = normalizedComponents
          .map(x => `${x.method}:${x.reference || 'NO-REF'}`)
          .join(' | ');

        const [payoutRows]: any = await this.db.query(
          `INSERT INTO payouts
           (id,chit_id,chit_month_id,payout_calculation_id,recipient_user_id,amount,
            payment_method,status,transaction_reference,paid_at,recorded_by,verified_by,
            receipt_number,notes,created_at,updated_at)
           VALUES(
            gen_random_uuid(),:chit,:month,NULL,:recipient,:amount,:method,'SETTLED',
            :reference,:paidAt,:actor,:actor,:receipt,:notes,NOW(),NOW()
           )
           RETURNING id`,
          {
            replacements: {
              chit: chitId,
              month: month.id,
              recipient: winnerUserId,
              amount: payout,
              method: parentMethod,
              reference: parentRef,
              paidAt: dto.completedAt || month.scheduled_date,
              actor: u.sub,
              receipt: dto.winnerReference || null,
              notes: dto.notes || 'Historical running-chit payout',
            },
            transaction,
          },
        );

        const payoutId = payoutRows[0].id;

        for (const component of normalizedComponents) {
          await this.db.query(
            `INSERT INTO payout_transactions
             (id,payout_id,amount,payment_method,transaction_reference,status,
              paid_at,recorded_by,notes,created_at,updated_at)
             VALUES(
              gen_random_uuid(),:payout,:amount,:method,:reference,'SETTLED',
              :paidAt,:actor,:notes,NOW(),NOW()
             )`,
            {
              replacements: {
                payout: payoutId,
                amount: component.amount,
                method: component.method,
                reference: component.reference,
                paidAt: dto.completedAt || month.scheduled_date,
                actor: u.sub,
                notes: component.notes,
              },
              transaction,
            },
          );
        }

        if (winnerUserId) {
          await this.db.query(
            `INSERT INTO ledger_entries
             (id,chit_id,chit_month_id,chit_participant_id,entry_type,amount,
              description,reference_type,reference_id,created_by,created_at,updated_at)
             SELECT gen_random_uuid(),:chit,:month,id,'PAYOUT',-:amount,
                    'Historical running-chit payout','PAYOUT',:payout,:actor,NOW(),NOW()
             FROM chit_participants
             WHERE chit_id=:chit AND user_id=:recipient`,
            {
              replacements: {
                chit: chitId,
                month: month.id,
                amount: payout,
                payout: payoutId,
                actor: u.sub,
                recipient: winnerUserId,
              },
              transaction,
            },
          );
        }
      }

      await this.db.query(
        `UPDATE chits
         SET accumulated_savings_amount=:closing,
             completed_months=:completed,
             updated_at=NOW()
         WHERE id=:chit`,
        {
          replacements: {
            closing: Math.max(0, closing),
            completed: monthNumber,
            chit: chitId,
          },
          transaction,
        },
      );

      return {
        success: true,
        data: {
          chitId,
          monthNumber,
          status: 'LOCKED',
          dataOrigin: 'HISTORICAL',
          contributionPerMember: contribution,
          expectedCollection: expected,
          collectedAmount: collected,
          openingSavings: opening,
          payoutAmount: payout,
          closingSavings: Math.max(0, closing),
          message:
            `Month ${monthNumber} finalized and locked. Historical financial values were derived server-side.`,
        },
      };
    });
  }

  @Post(':chitId/activate/:monthNumber')
  @ApiOperation({
    summary:
      'Activate the first live month after historical onboarding is complete',
  })
  async activate(
    @Param('chitId') chitId: string,
    @Param('monthNumber') monthRaw: string,
    @CurrentUser() u: any,
  ) {
    const monthNumber = Number(monthRaw);

    return this.db.transaction(async transaction => {
      if (!(await this.canManage(chitId, u.sub, transaction))) {
        throw new NotFoundException('Running chit not found');
      }

      const [chits]: any = await this.db.query(
        `SELECT * FROM chits WHERE id=:id FOR UPDATE`,
        { replacements: { id: chitId }, transaction },
      );
      if (!chits.length) throw new NotFoundException('Running chit not found');

      const chit = chits[0];
      const completed = Number(chit.completed_months || 0);
      const targetHistorical = Number(chit.historical_month_count || 0);

      if (monthNumber !== targetHistorical + 1) {
        throw new ConflictException(
          `Month ${targetHistorical + 1} is the configured takeover month`,
        );
      }

      if (completed !== targetHistorical) {
        throw new ConflictException(
          `Finalize all ${targetHistorical} historical month(s) before activation`,
        );
      }

      const [months]: any = await this.db.query(
        `SELECT * FROM chit_months
         WHERE chit_id=:chit AND month_number=:month
         FOR UPDATE`,
        { replacements: { chit: chitId, month: monthNumber }, transaction },
      );
      if (!months.length) {
        throw new NotFoundException(`Month ${monthNumber} not found`);
      }

      if (monthNumber > Number(chit.total_months)) {
        throw new BadRequestException('No remaining live month');
      }

      const [openHistorical]: any = await this.db.query(
        `SELECT COUNT(*)::int AS count
         FROM chit_months
         WHERE chit_id=:chit
           AND month_number<=:historical
           AND COALESCE(data_origin,'LIVE')<>'HISTORICAL'`,
        {
          replacements: {
            chit: chitId,
            historical: targetHistorical,
          },
          transaction,
        },
      );

      if (Number(openHistorical[0]?.count || 0) > 0) {
        throw new ConflictException(
          'All configured historical months must be finalized before activation',
        );
      }

      await this.db.query(
        `UPDATE chit_months
         SET status=CASE
             WHEN month_number=:month THEN 'ACTIVE'
             WHEN month_number<:month THEN 'LOCKED'
             ELSE status
           END,
           updated_at=NOW()
         WHERE chit_id=:chit`,
        {
          replacements: {
            chit: chitId,
            month: monthNumber,
          },
          transaction,
        },
      );

      await this.db.query(
        `UPDATE chit_months
         SET data_origin='LIVE'
         WHERE chit_id=:chit AND month_number=:month`,
        {
          replacements: { chit: chitId, month: monthNumber },
          transaction,
        },
      );

      await this.db.query(
        `UPDATE chits
         SET status='ACTIVE',
             started_at=COALESCE(started_at,NOW()),
             updated_at=NOW()
         WHERE id=:chit`,
        { replacements: { chit: chitId }, transaction },
      );

      return {
        success: true,
        data: {
          chitId,
          currentMonthNumber: monthNumber,
          chitStatus: 'ACTIVE',
          message:
            `Running chit activated. Month ${monthNumber} is now a normal LIVE month.`,
        },
      };
    });
  }
}

function faceAmount(chit: any) {
  const face = Number(chit.total_chit_amount);
  if (!Number.isFinite(face) || face <= 0) {
    throw new BadRequestException('Chit total amount is invalid');
  }
  return face;
}

@Module({ controllers: [RunningChitOnboardingController] })
export class RunningChitOnboardingModule {}
