import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class PayoutService {
  constructor(private readonly sequelize: Sequelize) {}

  async list(chitId: string, userId: string) {
    const [access]: any = await this.sequelize.query(
      `SELECT id FROM chits WHERE id=:chitId AND creator_id=:userId`,
      { replacements: { chitId, userId } },
    );
    if (!access.length) {
      throw new ConflictException('Only creator can view payout register');
    }

    const [rows]: any = await this.sequelize.query(
      `SELECT p.*,u.name AS recipient_name,u.mobile_number AS recipient_mobile
       FROM payouts p
       JOIN users u ON u.id=p.recipient_user_id
       WHERE p.chit_id=:chitId
       ORDER BY p.created_at DESC`,
      { replacements: { chitId } },
    );
    return rows;
  }

  async settle(payoutId: string, actor: string, dto: any) {
    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT p.*,c.creator_id
         FROM payouts p
         JOIN chits c ON c.id=p.chit_id
         WHERE p.id=:payoutId
         FOR UPDATE`,
        { replacements: { payoutId }, transaction },
      );

      if (!rows.length) {
        throw new NotFoundException('Payout not found');
      }

      const p = rows[0];

      if (p.creator_id !== actor) {
        throw new ConflictException('Only creator can settle payout');
      }

      if (!['SETTLED', 'FAILED'].includes(dto.status)) {
        throw new BadRequestException('Invalid payout status');
      }

      if (p.status === 'SETTLED') {
        throw new ConflictException('Payout already settled');
      }

      /*
       * IMPORTANT:
       * The production payouts table uses `paid_at`.
       * It does NOT have a `settled_at` column.
       *
       * The previous implementation used settled_at, which caused:
       *   column "settled_at" of relation "payouts" does not exist
       *
       * Do not add a duplicate settled_at column. `paid_at` is the
       * canonical settlement timestamp in migration 016-payouts.js.
       */
      const [updated]: any = await this.sequelize.query(
        `UPDATE payouts
         SET status=:status,
             payment_method=:method,
             transaction_reference=:reference,
             paid_at=CASE WHEN :status='SETTLED' THEN NOW() ELSE NULL END,
             notes=COALESCE(:notes,notes),
             updated_at=NOW()
         WHERE id=:payoutId
         RETURNING *`,
        {
          replacements: {
            payoutId,
            status: dto.status,
            method: dto.paymentMethod,
            reference: dto.transactionReference,
            notes: dto.notes ?? null,
          },
          transaction,
        },
      );

      if (dto.status === 'SETTLED') {
        const [already]: any = await this.sequelize.query(
          `SELECT id
           FROM ledger_entries
           WHERE reference_type='PAYOUT'
             AND reference_id=:payoutId
           LIMIT 1`,
          { replacements: { payoutId }, transaction },
        );

        if (already.length) {
          throw new ConflictException('Payout ledger entry already exists');
        }

        await this.sequelize.query(
          `INSERT INTO ledger_entries
           (id,chit_id,chit_month_id,chit_participant_id,entry_type,amount,description,
            reference_type,reference_id,created_by,created_at,updated_at)
           SELECT gen_random_uuid(),
                  p.chit_id,
                  p.chit_month_id,
                  cp.id,
                  'PAYOUT',
                  -p.amount,
                  'Payout settled',
                  'PAYOUT',
                  p.id,
                  :actor,
                  NOW(),
                  NOW()
           FROM payouts p
           JOIN chit_participants cp
             ON cp.user_id=p.recipient_user_id
            AND cp.chit_id=p.chit_id
           WHERE p.id=:payoutId`,
          { replacements: { payoutId, actor }, transaction },
        );
      }

      return updated[0];
    });
  }
}
