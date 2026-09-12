import {
  Body, Controller, Get, Param, Post, Module, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags,
} from '@nestjs/swagger';
import {
  IsArray, IsDateString, IsIn, IsInt, IsNumberString, IsOptional,
  IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Sequelize } from 'sequelize-typescript';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class MemberRow {
  @ApiProperty() @IsString() memberId!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() upiId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sequence?: number;
}

class PaymentRow {
  @ApiProperty() @IsInt() monthNumber!: number;
  @ApiProperty() @IsString() memberId!: string;
  @ApiProperty() @IsNumberString() amount!: string;
  @ApiProperty({ enum: ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'] })
  @IsIn(['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'])
  method!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class PayoutComponentRow {
  @ApiProperty() @IsInt() monthNumber!: number;
  @ApiProperty() @IsNumberString() amount!: string;
  @ApiProperty({ enum: ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'] })
  @IsIn(['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'])
  method!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class MonthRow {
  @ApiProperty() @IsInt() monthNumber!: number;
  @ApiProperty() @IsNumberString() amount!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() winnerMemberId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() winnerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() winnerMobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() payoutAmount?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() closingSavings?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() openingSavings?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() collectedAmount?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() discountAmount?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() winnerReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() monthType?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray()
  @ValidateNested({ each: true }) @Type(() => PayoutComponentRow)
  payoutComponents?: PayoutComponentRow[];
}

class ImportDto {
  @ApiProperty() @IsString() chitId!: string;
  @ApiProperty() @IsInt() currentMonthNumber!: number;
  @ApiProperty({ type: [MemberRow] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => MemberRow)
  members!: MemberRow[];
  @ApiProperty({ type: [MonthRow] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => MonthRow)
  months!: MonthRow[];
  @ApiProperty({ type: [PaymentRow] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => PaymentRow)
  payments!: PaymentRow[];
}

@ApiTags('Existing Chit Import')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'chit-import', version: '1' })
export class ChitImportController {
  constructor(private readonly db: Sequelize) {}

  private async canManage(chitId: string, userId: string, tx?: any) {
    const [rows]: any = await this.db.query(
      `SELECT 1
       FROM chits c
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

  private validatePayload(d: ImportDto) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Number.isInteger(d.currentMonthNumber) || d.currentMonthNumber <= 1) {
      errors.push('currentMonthNumber must be greater than 1 for a running chit');
    }

    const months = [...d.months].sort((a, b) => a.monthNumber - b.monthNumber);
    const seenMonths = new Set<number>();
    for (const m of months) {
      if (seenMonths.has(m.monthNumber)) errors.push(`Duplicate month ${m.monthNumber}`);
      seenMonths.add(m.monthNumber);
      if (m.monthNumber >= d.currentMonthNumber) {
        errors.push(`Month ${m.monthNumber} must be historical; current month is ${d.currentMonthNumber}`);
      }
      if (Number(m.amount) <= 0) errors.push(`Month ${m.monthNumber} amount must be greater than zero`);
    }

    const memberIds = new Set(d.members.map(x => x.memberId));
    if (!d.members.length) errors.push('At least one member is required');

    for (const p of d.payments) {
      if (!memberIds.has(p.memberId)) errors.push(`Payment references unknown member ${p.memberId}`);
      if (Number(p.amount) <= 0) errors.push(`Payment amount must be greater than zero for month ${p.monthNumber}`);
      if (!seenMonths.has(p.monthNumber)) errors.push(`Payment references unknown historical month ${p.monthNumber}`);
    }

    for (const m of d.months) {
      if (m.payoutAmount != null && Number(m.payoutAmount) < 0) {
        errors.push(`Invalid payout amount for month ${m.monthNumber}`);
      }
      if (m.closingSavings != null && Number(m.closingSavings) < 0) {
        errors.push(`Closing savings cannot be negative for month ${m.monthNumber}`);
      }
      if (m.payoutComponents?.length) {
        const total = m.payoutComponents.reduce((s, x) => s + Number(x.amount), 0);
        if (m.payoutAmount != null && Math.abs(total - Number(m.payoutAmount)) > 0.001) {
          errors.push(`Payout components for month ${m.monthNumber} do not equal payoutAmount`);
        }
      }
    }

    const historical = months.filter(x => x.monthNumber < d.currentMonthNumber);
    if (!historical.length) errors.push('At least one historical month is required');

    if (d.months.some(x => x.winnerName) && !d.months.some(x => x.winnerMemberId)) {
      warnings.push('Winner names were supplied without participant IDs; they will be stored as historical display data only');
    }

    return {
      errors,
      warnings,
      counts: {
        members: d.members.length,
        months: d.months.length,
        payments: d.payments.length,
        historicalMonths: historical.length,
      },
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate historical running-chit data before import' })
  async validate(@Body() d: ImportDto, @CurrentUser() u: any) {
    const result = this.validatePayload(d);
    const allowed = await this.canManage(d.chitId, u.sub);
    if (!allowed) result.errors.push('Only chit creator or ADMIN can import historical chit data');

    return {
      success: result.errors.length === 0,
      data: {
        valid: result.errors.length === 0,
        errors: result.errors,
        warnings: result.warnings,
        counts: result.counts,
      },
    };
  }

  @Post('create-batch')
  @ApiOperation({ summary: 'Create a draft historical running-chit import batch' })
  async batch(@Body() d: ImportDto, @CurrentUser() u: any) {
    const result = this.validatePayload(d);
    if (result.errors.length) return { success: false, data: result };

    if (!(await this.canManage(d.chitId, u.sub))) {
      return { success: false, message: 'Only chit creator or ADMIN can import historical chit data' };
    }

    const [r]: any = await this.db.query(
      `INSERT INTO chit_import_batches
       (chit_id,current_month_number,imported_by,status,summary,payload,created_at,updated_at)
       VALUES(:c,:m,:u,'DRAFT',:s::jsonb,:payload::jsonb,NOW(),NOW())
       RETURNING *`,
      {
        replacements: {
          c: d.chitId,
          m: d.currentMonthNumber,
          u: u.sub,
          s: JSON.stringify(result.counts),
          payload: JSON.stringify(d),
        },
      },
    );

    return { success: true, data: r[0] };
  }

  @Get('batches/:batchId')
  async get(@Param('batchId') id: string, @CurrentUser() u: any) {
    const [r]: any = await this.db.query(
      `SELECT b.* FROM chit_import_batches b
       WHERE b.id=:id AND b.imported_by=:u`,
      { replacements: { id, u: u.sub } },
    );
    if (!r.length) return { success: false, data: null };
    return {
      success: true,
      data: {
        ...r[0],
        payload: undefined,
        hasPayload: !!r[0].payload,
      },
    };
  }

  @Post('batches/:batchId/review')
  async review(@Param('batchId') id: string, @CurrentUser() u: any) {
    const [r]: any = await this.db.query(
      `UPDATE chit_import_batches
       SET status='REVIEWED',reviewed_at=NOW(),updated_at=NOW()
       WHERE id=:id AND imported_by=:u AND status='DRAFT'
       RETURNING *`,
      { replacements: { id, u: u.sub } },
    );
    return { success: !!r.length, data: r[0] ?? null };
  }

  @Post('batches/:batchId/apply')
  @ApiOperation({ summary: 'Materialize reviewed historical months and activate the next month' })
  async apply(@Param('batchId') id: string, @CurrentUser() u: any) {
    return this.db.transaction(async transaction => {
      const [batchRows]: any = await this.db.query(
        `SELECT * FROM chit_import_batches
         WHERE id=:id AND imported_by=:u
         FOR UPDATE`,
        { replacements: { id, u: u.sub }, transaction },
      );
      if (!batchRows.length) return { success: false, message: 'Import batch not found' };

      const batch = batchRows[0];
      if (batch.status !== 'REVIEWED') {
        return { success: false, message: 'Batch must be REVIEWED before apply' };
      }
      if (!batch.payload) {
        return { success: false, message: 'Historical import payload is missing; create a new batch' };
      }

      const d = batch.payload as ImportDto;
      const validation = this.validatePayload(d);
      if (validation.errors.length) {
        return { success: false, data: validation };
      }

      if (!(await this.canManage(d.chitId, u.sub, transaction))) {
        return { success: false, message: 'Only chit creator or ADMIN can apply historical chit data' };
      }

      const [chitRows]: any = await this.db.query(
        `SELECT * FROM chits WHERE id=:chitId FOR UPDATE`,
        { replacements: { chitId: d.chitId }, transaction },
      );
      if (!chitRows.length) return { success: false, message: 'Chit not found' };
      const chit = chitRows[0];

      // Ensure participant records exist without disturbing existing members.
      for (const member of d.members) {
        const [existing]: any = await this.db.query(
          `SELECT id FROM chit_participants
           WHERE chit_id=:chitId AND user_id=:userId
           LIMIT 1
           FOR UPDATE`,
          {
            replacements: { chitId: d.chitId, userId: member.memberId },
            transaction,
          },
        );

        if (!existing.length) {
          await this.db.query(
            `INSERT INTO chit_participants
             (id,chit_id,user_id,participation_role,status,joined_at,accepted_at,
              participant_sequence,notes,created_at,updated_at)
             VALUES(
              gen_random_uuid(),:chitId,:userId,'PARTICIPANT','ACTIVE',NOW(),NOW(),
              :sequence,:notes,NOW(),NOW()
             )`,
            {
              replacements: {
                chitId: d.chitId,
                userId: member.memberId,
                sequence: member.sequence ?? d.members.indexOf(member) + 1,
                notes: `Imported running-chit member${member.mobile ? `; mobile=${member.mobile}` : ''}${member.upiId ? `; upi=${member.upiId}` : ''}`,
              },
              transaction,
            },
          );
        }
      }

      const monthMap = new Map<number, any>();
      for (const m of d.months) {
        const [monthRows]: any = await this.db.query(
          `SELECT * FROM chit_months
           WHERE chit_id=:chitId AND month_number=:monthNumber
           FOR UPDATE`,
          {
            replacements: { chitId: d.chitId, monthNumber: m.monthNumber },
            transaction,
          },
        );
        if (!monthRows.length) {
          return {
            success: false,
            message: `Month ${m.monthNumber} does not exist in the chit schedule. Create the complete schedule first, then import history.`,
          };
        }

        const month = monthRows[0];
        if (String(month.data_origin || 'LIVE') === 'HISTORICAL') {
          return { success: false, message: `Month ${m.monthNumber} is already historical/imported` };
        }

        const historicalData = {
          dataOrigin: 'HISTORICAL',
          completedAt: m.completedAt ?? null,
          winnerMemberId: m.winnerMemberId ?? null,
          winnerName: m.winnerName ?? null,
          winnerMobile: m.winnerMobile ?? null,
          winnerReference: m.winnerReference ?? null,
          collectedAmount: m.collectedAmount != null ? Number(m.collectedAmount) : null,
          payoutAmount: m.payoutAmount != null ? Number(m.payoutAmount) : null,
          openingSavings: m.openingSavings != null ? Number(m.openingSavings) : null,
          closingSavings: m.closingSavings != null ? Number(m.closingSavings) : null,
          discountAmount: m.discountAmount != null ? Number(m.discountAmount) : null,
          notes: m.notes ?? null,
        };

        await this.db.query(
          `UPDATE chit_months
           SET data_origin='HISTORICAL',
               status='LOCKED',
               historical_data=:historicalData::jsonb,
               updated_at=NOW()
           WHERE id=:monthId`,
          {
            replacements: {
              monthId: month.id,
              historicalData: JSON.stringify(historicalData),
            },
            transaction,
          },
        );

        monthMap.set(m.monthNumber, { ...month, historicalData });
      }

      // Create verified historical contribution obligations/payments.
      for (const p of d.payments) {
        const month = monthMap.get(p.monthNumber);
        if (!month) return { success: false, message: `Historical month ${p.monthNumber} not found` };

        const [participantRows]: any = await this.db.query(
          `SELECT id,user_id FROM chit_participants
           WHERE chit_id=:chitId AND user_id=:userId
           LIMIT 1
           FOR UPDATE`,
          {
            replacements: { chitId: d.chitId, userId: p.memberId },
            transaction,
          },
        );
        if (!participantRows.length) {
          return { success: false, message: `Member ${p.memberId} is not a participant in the chit` };
        }

        const participant = participantRows[0];

        const [obligationRows]: any = await this.db.query(
          `SELECT * FROM contribution_obligations
           WHERE chit_month_id=:monthId AND chit_participant_id=:participantId
           LIMIT 1
           FOR UPDATE`,
          {
            replacements: {
              monthId: month.id,
              participantId: participant.id,
            },
            transaction,
          },
        );

        let obligation: any;
        if (obligationRows.length) {
          obligation = obligationRows[0];
        } else {
          const [created]: any = await this.db.query(
            `INSERT INTO contribution_obligations
             (id,chit_month_id,chit_participant_id,due_amount,paid_amount,
              outstanding_amount,status,due_date,created_at,updated_at)
             VALUES(
              gen_random_uuid(),:monthId,:participantId,:dueAmount,0,:dueAmount,
              'PENDING',:dueDate,NOW(),NOW()
             )
             RETURNING *`,
            {
              replacements: {
                monthId: month.id,
                participantId: participant.id,
                dueAmount: month.scheduled_amount,
                dueDate: month.scheduled_date,
              },
              transaction,
            },
          );
          obligation = created[0];
        }

        const [duplicate]: any = await this.db.query(
          `SELECT id FROM payments
           WHERE import_batch_id=:batchId
             AND chit_month_id=:monthId
             AND chit_participant_id=:participantId
             AND amount=:amount
             AND COALESCE(transaction_reference,'')=COALESCE(:reference,'')
           LIMIT 1`,
          {
            replacements: {
              batchId: id,
              monthId: month.id,
              participantId: participant.id,
              amount: Number(p.amount),
              reference: p.reference ?? null,
            },
            transaction,
          },
        );
        if (duplicate.length) continue;

        await this.db.query(
          `INSERT INTO payments
           (id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,
            payment_method,status,transaction_reference,payment_date,submitted_at,
            verified_at,recorded_by,verified_by,notes,receipt_number,import_batch_id,
            created_at,updated_at)
           VALUES(
            gen_random_uuid(),:chitId,:monthId,:participantId,:obligationId,:amount,
            :method,'VERIFIED',:reference,COALESCE(:paymentDate,:scheduledDate),
            COALESCE(:paymentDate,:scheduledDate),COALESCE(:paymentDate,:scheduledDate),
            :actor,:actor,:notes,:receipt,:batchId,NOW(),NOW()
           )`,
          {
            replacements: {
              chitId: d.chitId,
              monthId: month.id,
              participantId: participant.id,
              obligationId: obligation.id,
              amount: Number(p.amount),
              method: p.method,
              reference: p.reference ?? null,
              paymentDate: p.paymentDate ?? null,
              scheduledDate: month.scheduled_date,
              actor: u.sub,
              notes: p.notes ?? 'Imported historical payment',
              receipt: p.reference ?? null,
              batchId: id,
            },
            transaction,
          },
        );

        await this.db.query(
          `UPDATE contribution_obligations
           SET paid_amount=LEAST(due_amount,COALESCE(paid_amount,0)+:amount),
               outstanding_amount=GREATEST(0,due_amount-(COALESCE(paid_amount,0)+:amount)),
               status=CASE
                 WHEN GREATEST(0,due_amount-(COALESCE(paid_amount,0)+:amount))=0 THEN 'PAID'
                 ELSE 'PARTIAL'
               END,
               updated_at=NOW()
           WHERE id=:obligationId`,
          {
            replacements: { amount: Number(p.amount), obligationId: obligation.id },
            transaction,
          },
        );
      }

      // Materialize historical payouts after collections.
      for (const m of d.months) {
        if (m.payoutAmount == null || Number(m.payoutAmount) <= 0) continue;

        const month = monthMap.get(m.monthNumber);
        const [existingPayout]: any = await this.db.query(
          `SELECT id FROM payouts
           WHERE chit_month_id=:monthId AND status='SETTLED'
           LIMIT 1`,
          { replacements: { monthId: month.id }, transaction },
        );
        if (existingPayout.length) continue;

        const [recipient]: any = m.winnerMemberId
          ? await this.db.query(
              `SELECT user_id FROM chit_participants
               WHERE chit_id=:chitId AND user_id=:userId LIMIT 1`,
              { replacements: { chitId: d.chitId, userId: m.winnerMemberId }, transaction },
            )
          : [[]];

        const recipientUserId = recipient?.[0]?.user_id ?? m.winnerMemberId ?? null;
        const components = Array.isArray(m.payoutComponents) ? m.payoutComponents : [];
        const parentMethod = components.length === 1 ? components[0].method : (components.length > 1 ? 'SPLIT' : 'HISTORICAL');
        const parentReference = components.length
          ? components.map((x: any) => `${x.method}:${x.reference || 'NO-REF'}`).join(' | ')
          : (m.winnerReference ?? null);

        const [payout]: any = await this.db.query(
          `INSERT INTO payouts
           (id,chit_id,chit_month_id,payout_calculation_id,recipient_user_id,
            amount,payment_method,status,transaction_reference,paid_at,
            recorded_by,verified_by,receipt_number,notes,import_batch_id,created_at,updated_at)
           VALUES(
            gen_random_uuid(),:chitId,:monthId,NULL,:recipientUserId,
            :amount,:method,'SETTLED',:reference,
            COALESCE(:paidAt,NOW()),:actor,:actor,:receipt,:notes,:batchId,NOW(),NOW()
           )
           RETURNING id`,
          {
            replacements: {
              chitId: d.chitId,
              monthId: month.id,
              recipientUserId,
              amount: Number(m.payoutAmount),
              method: parentMethod,
              reference: parentReference,
              paidAt: m.completedAt ?? null,
              actor: u.sub,
              receipt: m.winnerReference ?? null,
              notes: m.notes ?? 'Imported historical payout',
              batchId: id,
            },
            transaction,
          },
        );

        if (components.length && payout?.[0]?.id) {
          for (const c of components) {
            await this.db.query(
              `INSERT INTO payout_transactions
               (id,payout_id,amount,payment_method,transaction_reference,status,
                paid_at,recorded_by,notes,created_at,updated_at)
               VALUES(
                gen_random_uuid(),:payoutId,:amount,:method,:reference,'SETTLED',
                COALESCE(:paidAt,NOW()),:actor,:notes,NOW(),NOW()
               )`,
              {
                replacements: {
                  payoutId: payout[0].id,
                  amount: Number(c.amount),
                  method: c.method,
                  reference: c.reference ?? null,
                  paidAt: m.completedAt ?? null,
                  actor: u.sub,
                  notes: c.notes ?? 'Imported historical payout component',
                },
                transaction,
              },
            );
          }
        }

        await this.db.query(
          `INSERT INTO ledger_entries
           (id,chit_id,chit_month_id,chit_participant_id,entry_type,amount,
            description,reference_type,reference_id,created_by,created_at,updated_at)
           SELECT gen_random_uuid(),:chitId,:monthId,cp.id,'PAYOUT',-:amount,
                  'Historical payout imported','PAYOUT',:payoutId,:actor,NOW(),NOW()
           FROM chit_participants cp
           WHERE cp.chit_id=:chitId
             AND cp.user_id=:recipientUserId`,
          {
            replacements: {
              chitId: d.chitId,
              monthId: month.id,
              amount: Number(m.payoutAmount),
              payoutId: payout[0].id,
              actor: u.sub,
              recipientUserId,
            },
            transaction,
          },
        );
      }

      // The imported history is now immutable and the requested next month is
      // the only operational starting point. Future months remain scheduled.
      await this.db.query(
        `UPDATE chit_months
         SET status=CASE
           WHEN month_number=:currentMonth THEN 'ACTIVE'
           WHEN month_number<:currentMonth THEN 'LOCKED'
           ELSE status
         END,
         updated_at=NOW()
         WHERE chit_id=:chitId`,
        {
          replacements: { chitId: d.chitId, currentMonth: d.currentMonthNumber },
          transaction,
        },
      );

      await this.db.query(
        `UPDATE chits
         SET status='ACTIVE',
             started_at=COALESCE(started_at,NOW()),
             accumulated_savings_amount=COALESCE(
               (SELECT CAST(:closingSavings AS numeric)),
               accumulated_savings_amount
             ),
             updated_at=NOW()
         WHERE id=:chitId`,
        {
          replacements: {
            chitId: d.chitId,
            closingSavings: (() => {
              const ordered = [...d.months]
                .filter(x => x.closingSavings != null)
                .sort((a,b) => a.monthNumber - b.monthNumber);
              return ordered.length ? Number(ordered[ordered.length - 1].closingSavings).toFixed(2) : null;
            })(),
          },
          transaction,
        },
      );

      await this.db.query(
        `UPDATE chit_import_batches
         SET status='ACTIVATED',
             applied_at=NOW(),
             applied_by=:u,
             updated_at=NOW()
         WHERE id=:id`,
        { replacements: { id, u: u.sub }, transaction },
      );

      return {
        success: true,
        data: {
          batchId: id,
          chitId: d.chitId,
          historicalMonths: d.months.map(x => x.monthNumber),
          currentMonthNumber: d.currentMonthNumber,
          chitStatus: 'ACTIVE',
          message: `Historical months imported and Month ${d.currentMonthNumber} activated. Historical months are LOCKED.`,
        },
      };
    });
  }
}

@Module({
  controllers: [ChitImportController],
})
export class ChitImportModule {}
