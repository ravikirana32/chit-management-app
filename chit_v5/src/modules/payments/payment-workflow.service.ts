import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class PaymentWorkflowService {
  constructor(private readonly sequelize: Sequelize) {}

  /**
   * Ensures that the current month's contribution obligations exist and returns
   * them. Obligations are created from the month's scheduled_amount for every
   * ACTIVE participant. The month row is locked so two simultaneous requests
   * cannot create duplicate obligations.
   *
   * This is intentionally idempotent: calling the endpoint repeatedly returns
   * the same obligation ids instead of creating new obligations.
   */
  async listObligations(chitId: string, monthId: string, userId: string) {
    return this.sequelize.transaction(async transaction => {
      const [monthRows]: any = await this.sequelize.query(
        `SELECT m.*, c.creator_id, c.status AS chit_status, c.total_members
         FROM chit_months m
         JOIN chits c ON c.id=m.chit_id
         WHERE m.id=:monthId AND m.chit_id=:chitId
         FOR UPDATE OF m`,
        { replacements: { chitId, monthId }, transaction },
      );

      if (!monthRows.length) throw new NotFoundException('Chit month not found');
      const month = monthRows[0];

      const [accessRows]: any = await this.sequelize.query(
        `SELECT cp.id, cp.user_id, cp.participant_sequence, cp.status
         FROM chit_participants cp
         WHERE cp.chit_id=:chitId
           AND cp.user_id=:userId
         LIMIT 1`,
        { replacements: { chitId, userId }, transaction },
      );

      const isCreator = month.creator_id === userId;
      const isMember = accessRows.length > 0;
      if (!isCreator && !isMember) {
        throw new ConflictException('You do not have access to this chit');
      }

      if (month.status === 'LOCKED') {
        const [existingLocked]: any = await this.sequelize.query(
          `SELECT o.*,cp.participant_sequence,cp.user_id
           FROM contribution_obligations o
           JOIN chit_participants cp ON cp.id=o.chit_participant_id
           WHERE o.chit_month_id=:monthId
           ORDER BY cp.participant_sequence`,
          { replacements: { monthId }, transaction },
        );
        return this.filterObligations(existingLocked, isCreator, userId, chitId, month);
      }

      const [participants]: any = await this.sequelize.query(
        `SELECT id,user_id,participant_sequence,status
         FROM chit_participants
         WHERE chit_id=:chitId AND status='ACTIVE'
         ORDER BY participant_sequence
         FOR UPDATE`,
        { replacements: { chitId }, transaction },
      );

      if (!participants.length) {
        throw new ConflictException('No active participants found for this chit');
      }

      for (const participant of participants) {
        await this.sequelize.query(
          `INSERT INTO contribution_obligations
             (id,chit_month_id,chit_participant_id,due_amount,paid_amount,
              outstanding_amount,status,due_date,created_at,updated_at)
           SELECT gen_random_uuid(),:monthId,:participantId,:amount,0,:amount,'PENDING',:dueDate,NOW(),NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM contribution_obligations
             WHERE chit_month_id=:monthId AND chit_participant_id=:participantId
           )`,
          {
            replacements: {
              monthId,
              participantId: participant.id,
              amount: month.scheduled_amount,
              dueDate: month.scheduled_date,
            },
            transaction,
          },
        );
      }

      const [obligations]: any = await this.sequelize.query(
        `SELECT o.*,cp.participant_sequence,cp.user_id
         FROM contribution_obligations o
         JOIN chit_participants cp ON cp.id=o.chit_participant_id
         WHERE o.chit_month_id=:monthId
         ORDER BY cp.participant_sequence`,
        { replacements: { monthId }, transaction },
      );

      return this.filterObligations(obligations, isCreator, userId, chitId, month);
    });
  }

  private filterObligations(
    obligations: any[],
    isCreator: boolean,
    userId: string,
    chitId: string,
    month: any,
  ) {
    const visible = isCreator
      ? obligations
      : obligations.filter((o: any) => o.user_id === userId);

    return {
      success: true,
      data: {
        chitId,
        monthId: month.id,
        monthNumber: Number(month.month_number),
        scheduledDate: month.scheduled_date,
        scheduledAmount: Number(month.scheduled_amount),
        status: month.status,
        obligations: visible.map((o: any) => ({
          id: o.id,
          chitMonthId: o.chit_month_id,
          chitParticipantId: o.chit_participant_id,
          participantSequence: Number(o.participant_sequence),
          dueAmount: Number(o.due_amount),
          paidAmount: Number(o.paid_amount),
          outstandingAmount: Number(o.outstanding_amount),
          status: o.status,
          dueDate: o.due_date,
          userId: isCreator ? o.user_id : undefined,
        })),
        count: visible.length,
        nextStep: 'Use obligations[].id as obligationId when submitting a contribution payment.',
      },
    };
  }

  async submit(chitId: string, participantId: string, userId: string, dto: any) {
    return this.sequelize.transaction(async transaction => {
      const [r]: any = await this.sequelize.query(
        `SELECT o.*,m.chit_id,cp.user_id
         FROM contribution_obligations o
         JOIN chit_months m ON m.id=o.chit_month_id
         JOIN chit_participants cp ON cp.id=o.chit_participant_id
         WHERE o.id=:oid AND m.chit_id=:chitId
         FOR UPDATE`,
        { replacements: { oid: dto.obligationId, chitId }, transaction },
      );
      if (!r.length) throw new NotFoundException('Contribution obligation not found');
      const o = r[0];

      if (o.user_id !== userId || o.chit_participant_id !== participantId)
        throw new ConflictException('Payment does not belong to authenticated participant');

      if (['VERIFIED', 'PAID'].includes(o.status) || Number(o.outstanding_amount) <= 0)
        throw new ConflictException('Contribution obligation is already fully paid');

      const amount = Number(dto.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > Number(o.outstanding_amount))
        throw new BadRequestException('Invalid payment amount');

      const [p]: any = await this.sequelize.query(
        `INSERT INTO payments
         (id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,
          payment_method,status,transaction_reference,payment_date,submitted_at,
          recorded_by,notes,created_at,updated_at)
         VALUES(gen_random_uuid(),:chitId,:mid,:pid,:oid,:amount,:method,'SUBMITTED',
                :ref,:date,NOW(),:user,:notes,NOW(),NOW())
         RETURNING *`,
        {
          replacements: {
            chitId,
            mid: o.chit_month_id,
            pid: participantId,
            oid: dto.obligationId,
            amount,
            method: dto.paymentMethod,
            ref: dto.transactionReference,
            date: dto.paymentDate,
            user: userId,
            notes: dto.notes ?? null,
          },
          transaction,
        },
      );
      return { payment: p[0], obligationId: dto.obligationId };
    });
  }

  async verify(paymentId: string, verifier: string, dto: any) {
    return this.sequelize.transaction(async transaction => {
      const [r]: any = await this.sequelize.query(
        `SELECT p.*,o.due_amount,o.paid_amount,o.outstanding_amount,c.creator_id
         FROM payments p
         JOIN contribution_obligations o ON o.id=p.obligation_id
         JOIN chits c ON c.id=p.chit_id
         WHERE p.id=:id FOR UPDATE`,
        { replacements: { id: paymentId }, transaction },
      );
      if (!r.length) throw new NotFoundException('Payment not found');
      const p = r[0];
      if (p.creator_id !== verifier)
        throw new ConflictException('Only the chit creator can verify payments');
      if (p.status === 'VERIFIED')
        throw new ConflictException('Payment already verified');

      if (dto.status === 'REJECTED') {
        const [u]: any = await this.sequelize.query(
          `UPDATE payments SET status='REJECTED',verified_at=NOW(),verified_by=:v,
                  notes=COALESCE(:n,notes),updated_at=NOW()
           WHERE id=:id RETURNING *`,
          { replacements: { id: paymentId, v: verifier, n: dto.notes ?? null }, transaction },
        );
        return { payment: u[0] };
      }

      if (dto.status !== 'VERIFIED')
        throw new BadRequestException('Status must be VERIFIED or REJECTED');

      const paid = Number(p.paid_amount) + Number(p.amount);
      const out = Math.max(0, Number(p.due_amount) - paid);
      const status = out === 0 ? 'VERIFIED' : 'PARTIAL';

      await this.sequelize.query(
        `UPDATE contribution_obligations
         SET paid_amount=:paid,outstanding_amount=:out,status=:status,updated_at=NOW()
         WHERE id=:oid`,
        { replacements: { paid, out, status, oid: p.obligation_id }, transaction },
      );

      const [u]: any = await this.sequelize.query(
        `UPDATE payments SET status='VERIFIED',verified_at=NOW(),verified_by=:v,
                receipt_number=:r,notes=COALESCE(:n,notes),updated_at=NOW()
         WHERE id=:id RETURNING *`,
        {
          replacements: {
            id: paymentId,
            v: verifier,
            r: dto.receiptNumber ?? null,
            n: dto.notes ?? null,
          },
          transaction,
        },
      );
      return { payment: u[0], obligation: { paidAmount: paid, outstandingAmount: out, status } };
    });
  }
}
