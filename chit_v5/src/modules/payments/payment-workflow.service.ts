import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class PaymentWorkflowService {
  constructor(private readonly sequelize: Sequelize) {}

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

      const [memberRows]: any = await this.sequelize.query(
        `SELECT id,user_id,status
         FROM chit_participants
         WHERE chit_id=:chitId AND user_id=:userId LIMIT 1`,
        { replacements: { chitId, userId }, transaction },
      );

      const isCreator = month.creator_id === userId;
      if (!isCreator && !memberRows.length) {
        throw new ConflictException('You do not have access to this chit');
      }

      const [participants]: any = await this.sequelize.query(
        `SELECT id,user_id,participant_sequence,status
         FROM chit_participants
         WHERE chit_id=:chitId AND status='ACTIVE'
         ORDER BY participant_sequence FOR UPDATE`,
        { replacements: { chitId }, transaction },
      );

      if (!participants.length) {
        throw new ConflictException('No active participants found for this chit');
      }

      for (const p of participants) {
        await this.sequelize.query(
          `INSERT INTO contribution_obligations
           (id,chit_month_id,chit_participant_id,due_amount,paid_amount,
            outstanding_amount,status,due_date,created_at,updated_at)
           SELECT gen_random_uuid(),:monthId,:participantId,:amount,0,:amount,
                  'PENDING',:dueDate,NOW(),NOW()
           WHERE NOT EXISTS(
             SELECT 1 FROM contribution_obligations
             WHERE chit_month_id=:monthId AND chit_participant_id=:participantId
           )`,
          {
            replacements: {
              monthId,
              participantId: p.id,
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

      const visible = isCreator
        ? obligations
        : obligations.filter((o: any) => o.user_id === userId);

      return {
        success: true,
        data: {
          chitId,
          monthId,
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
          nextStep:
            'Use obligations[].id as obligationId when submitting a contribution payment.',
        },
      };
    });
  }

  /**
   * NEW:
   * Lists all payments belonging to a chit/month.
   * Creator sees all member payments; a member sees only their own.
   */
  async listPayments(chitId: string, monthId: string, userId: string) {
    const [access]: any = await this.sequelize.query(
      `SELECT c.creator_id,
              cp.id AS requester_participant_id
       FROM chits c
       LEFT JOIN chit_participants cp
         ON cp.chit_id=c.id AND cp.user_id=:userId
       WHERE c.id=:chitId`,
      { replacements: { chitId, userId } },
    );

    if (!access.length) throw new NotFoundException('Chit not found');

    const isCreator = access[0].creator_id === userId;
    if (!isCreator && !access[0].requester_participant_id) {
      throw new ConflictException('You do not have access to this chit');
    }

    const [rows]: any = await this.sequelize.query(
      `SELECT
         p.id,
         p.chit_id,
         p.chit_month_id,
         p.chit_participant_id,
         p.obligation_id,
         p.amount,
         p.payment_method,
         p.status,
         p.transaction_reference,
         p.payment_date,
         p.submitted_at,
         p.verified_at,
         p.receipt_number,
         p.notes,
         p.created_at,
         cp.participant_sequence,
         cp.user_id,
         o.due_amount,
         o.paid_amount AS obligation_paid_amount,
         o.outstanding_amount,
         o.status AS obligation_status
       FROM payments p
       JOIN chit_participants cp ON cp.id=p.chit_participant_id
       JOIN contribution_obligations o ON o.id=p.obligation_id
       WHERE p.chit_id=:chitId
         AND p.chit_month_id=:monthId
         AND (:isCreator = true OR p.chit_participant_id=:requesterParticipantId)
       ORDER BY cp.participant_sequence,p.created_at`,
      {
        replacements: {
          chitId,
          monthId,
          isCreator,
          requesterParticipantId: access[0].requester_participant_id,
        },
      },
    );

    return {
      success: true,
      data: {
        chitId,
        monthId,
        payments: rows.map((p: any) => ({
          id: p.id,
          participantId: p.chit_participant_id,
          participantSequence: Number(p.participant_sequence),
          userId: isCreator ? p.user_id : undefined,
          obligationId: p.obligation_id,
          amount: Number(p.amount),
          paymentMethod: p.payment_method,
          status: p.status,
          transactionReference: p.transaction_reference,
          paymentDate: p.payment_date,
          submittedAt: p.submitted_at,
          verifiedAt: p.verified_at,
          receiptNumber: p.receipt_number,
          notes: p.notes,
          obligationDueAmount: Number(p.due_amount),
          obligationPaidAmount: Number(p.obligation_paid_amount),
          outstandingAmount: Number(p.outstanding_amount),
          obligationStatus: p.obligation_status,
          createdAt: p.created_at,
        })),
        count: rows.length,
      },
    };
  }

  async submit(chitId: string, participantId: string, userId: string, dto: any) {
    return this.sequelize.transaction(async transaction => {
      const [r]: any = await this.sequelize.query(
        `SELECT o.*,m.chit_id,cp.user_id,cp.status AS participant_status
         FROM contribution_obligations o
         JOIN chit_months m ON m.id=o.chit_month_id
         JOIN chit_participants cp ON cp.id=o.chit_participant_id
         JOIN chits c ON c.id=m.chit_id
         WHERE o.id=:oid AND m.chit_id=:chitId
           AND cp.id=:participantId
         FOR UPDATE`,
        {
          replacements: {
            oid: dto.obligationId,
            chitId,
            participantId,
          },
          transaction,
        },
      );

      if (!r.length) {
        throw new NotFoundException('Contribution obligation not found');
      }

      const o = r[0];

      if (o.user_id !== userId || o.chit_participant_id !== participantId) {
        throw new ConflictException(
          'Payment does not belong to authenticated participant',
        );
      }

      if (
        ['VERIFIED', 'PAID'].includes(o.status) ||
        Number(o.outstanding_amount) <= 0
      ) {
        throw new ConflictException(
          'Contribution obligation is already fully paid',
        );
      }

      const amount = Number(dto.amount);
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > Number(o.outstanding_amount)
      ) {
        throw new BadRequestException('Invalid payment amount');
      }

      // NEW: database-backed idempotency lookup.
      if (dto.idempotencyKey) {
        const [existing]: any = await this.sequelize.query(
          `SELECT *
           FROM payments
           WHERE chit_id=:chitId
             AND idempotency_key=:idempotencyKey
           LIMIT 1
           FOR UPDATE`,
          {
            replacements: {
              chitId,
              idempotencyKey: dto.idempotencyKey,
            },
            transaction,
          },
        );

        if (existing.length) {
          return {
            payment: existing[0],
            obligationId: dto.obligationId,
            idempotentReplay: true,
          };
        }
      }

      const [p]: any = await this.sequelize.query(
        `INSERT INTO payments
         (id,chit_id,chit_month_id,chit_participant_id,obligation_id,amount,
          payment_method,status,transaction_reference,payment_date,submitted_at,
          recorded_by,notes,idempotency_key,created_at,updated_at)
         VALUES(
          gen_random_uuid(),:chitId,:mid,:pid,:oid,:amount,:method,'SUBMITTED',
          :ref,:date,NOW(),:user,:notes,:idempotencyKey,NOW(),NOW()
         )
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
            idempotencyKey: dto.idempotencyKey ?? null,
          },
          transaction,
        },
      );

      return {
        payment: p[0],
        obligationId: dto.obligationId,
        idempotentReplay: false,
      };
    });
  }

  async verify(paymentId: string, verifier: string, dto: any) {
    return this.sequelize.transaction(async transaction => {
      const [r]: any = await this.sequelize.query(
        `SELECT p.*,o.due_amount,o.paid_amount,o.outstanding_amount,
                o.status AS obligation_status,c.creator_id
         FROM payments p
         JOIN contribution_obligations o ON o.id=p.obligation_id
         JOIN chits c ON c.id=p.chit_id
         WHERE p.id=:id FOR UPDATE`,
        { replacements: { id: paymentId }, transaction },
      );

      if (!r.length) throw new NotFoundException('Payment not found');

      const p = r[0];

      const [verifyAccess]: any = await this.sequelize.query(
        `SELECT 1 FROM chits c
         LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
         LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:verifier
         WHERE c.id=:chitId
           AND (c.creator_id=:verifier OR ca.can_verify_payments=true)
         LIMIT 1`,
        { replacements: { chitId:p.chit_id, verifier }, transaction },
      );
      if (!verifyAccess.length)
        throw new ConflictException('Payment verification permission is required for this chit');

      if (p.status === 'VERIFIED') {
        throw new ConflictException('Payment already verified');
      }

      if (p.status !== 'SUBMITTED') {
        throw new ConflictException(
          'Only submitted payments can be verified',
        );
      }

      if (dto.status === 'REJECTED') {
        const [u]: any = await this.sequelize.query(
          `UPDATE payments
           SET status='REJECTED',verified_at=NOW(),verified_by=:v,
               notes=COALESCE(:n,notes),updated_at=NOW()
           WHERE id=:id RETURNING *`,
          {
            replacements: {
              id: paymentId,
              v: verifier,
              n: dto.notes ?? null,
            },
            transaction,
          },
        );
        return { payment: u[0] };
      }

      if (dto.status !== 'VERIFIED') {
        throw new BadRequestException(
          'Status must be VERIFIED or REJECTED',
        );
      }

      const paid = Number(p.paid_amount) + Number(p.amount);
      if (paid > Number(p.due_amount)) {
        throw new ConflictException(
          'Verified payment would exceed obligation amount',
        );
      }

      const out = Math.max(0, Number(p.due_amount) - paid);
      const obligationStatus = out === 0 ? 'PAID' : 'PARTIAL';

      await this.sequelize.query(
        `UPDATE contribution_obligations
         SET paid_amount=:paid,outstanding_amount=:out,status=:status,
             updated_at=NOW()
         WHERE id=:oid`,
        {
          replacements: {
            paid,
            out,
            status: obligationStatus,
            oid: p.obligation_id,
          },
          transaction,
        },
      );

      const [u]: any = await this.sequelize.query(
        `UPDATE payments
         SET status='VERIFIED',verified_at=NOW(),verified_by=:v,
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

      return {
        payment: u[0],
        obligation: {
          paidAmount: paid,
          outstandingAmount: out,
          status: obligationStatus,
        },
      };
    });
  }

  /**
   * NEW:
   * Atomically verifies every SUBMITTED payment for a chit/month.
   * If one payment is invalid, the transaction rolls back all changes.
   */
  async verifyAll(
    chitId: string,
    monthId: string,
    verifier: string,
    dto: any,
  ) {
    return this.sequelize.transaction(async transaction => {
      const [access]: any = await this.sequelize.query(
        `SELECT c.id
         FROM chits c
         LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
         LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:verifier
         WHERE c.id=:chitId
           AND (c.creator_id=:verifier OR ca.can_verify_payments=true)
         FOR UPDATE OF c`,
        { replacements: { chitId, verifier }, transaction },
      );

      if (!access.length) {
        throw new ConflictException(
          'Payment verification permission is required for this chit',
        );
      }

      const [rows]: any = await this.sequelize.query(
        `SELECT p.id,p.amount,o.due_amount,o.paid_amount,
                o.id AS obligation_id,o.outstanding_amount
         FROM payments p
         JOIN contribution_obligations o ON o.id=p.obligation_id
         WHERE p.chit_id=:chitId
           AND p.chit_month_id=:monthId
           AND p.status='SUBMITTED'
         ORDER BY p.created_at
         FOR UPDATE OF p,o`,
        { replacements: { chitId, monthId }, transaction },
      );

      if (!rows.length) {
        return {
          success: true,
          chitId,
          monthId,
          verifiedCount: 0,
          paymentIds: [],
          message: 'No submitted payments to verify',
        };
      }

      const verified: string[] = [];

      for (const p of rows) {
        const paid = Number(p.paid_amount) + Number(p.amount);
        if (paid > Number(p.due_amount)) {
          throw new ConflictException(
            `Payment ${p.id} would exceed the obligation amount`,
          );
        }

        const out = Math.max(0, Number(p.due_amount) - paid);
        const status = out === 0 ? 'PAID' : 'PARTIAL';

        await this.sequelize.query(
          `UPDATE contribution_obligations
           SET paid_amount=:paid,outstanding_amount=:out,status=:status,
               updated_at=NOW()
           WHERE id=:oid`,
          {
            replacements: {
              paid,
              out,
              status,
              oid: p.obligation_id,
            },
            transaction,
          },
        );

        await this.sequelize.query(
          `UPDATE payments
           SET status='VERIFIED',verified_at=NOW(),verified_by=:verifier,
               receipt_number=:receipt,notes=COALESCE(:notes,notes),
               updated_at=NOW()
           WHERE id=:id`,
          {
            replacements: {
              id: p.id,
              verifier,
              receipt: dto.receiptNumber ?? null,
              notes: dto.notes ?? null,
            },
            transaction,
          },
        );

        verified.push(p.id);
      }

      return {
        success: true,
        chitId,
        monthId,
        verifiedCount: verified.length,
        paymentIds: verified,
        status: 'VERIFIED',
      };
    });
  }
}
