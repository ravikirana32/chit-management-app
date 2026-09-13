import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class LedgerService {
  constructor(private readonly sequelize: Sequelize) {}

  async getParticipantLedger(chitId: string, participantId: string, userId: string) {
    const [ownership]: any = await this.sequelize.query(
      `SELECT cp.id,cp.user_id,cp.chit_id
       FROM chit_participants cp
       WHERE cp.id=:participantId AND cp.chit_id=:chitId`,
      { replacements: { participantId, chitId } },
    );
    if (!ownership.length) throw new NotFoundException('Participant not found');
    if (ownership[0].user_id !== userId) {
      throw new ConflictException('Participant does not belong to authenticated user');
    }

    const [rows]: any = await this.sequelize.query(
      this.ledgerQuery('AND le.chit_participant_id=:participantId'),
      { replacements: { chitId, participantId } },
    );
    return this.withBalance(rows);
  }

  async getChitLedger(chitId: string, userId: string) {
    const [access]: any = await this.sequelize.query(
      `SELECT id FROM chits WHERE id=:chitId AND creator_id=:userId`,
      { replacements: { chitId, userId } },
    );
    if (!access.length) {
      throw new ConflictException('Only the chit creator can view the complete chit ledger');
    }

    const [rows]: any = await this.sequelize.query(
      this.ledgerQuery(''),
      { replacements: { chitId } },
    );
    return this.withBalance(rows);
  }

  async recordAdjustment(chitId: string, actorUserId: string, dto: any) {
    return this.sequelize.transaction(async transaction => {
      const [chit]: any = await this.sequelize.query(
        `SELECT id FROM chits WHERE id=:chitId AND creator_id=:actor`,
        { replacements: { chitId, actor: actorUserId }, transaction },
      );
      if (!chit.length) throw new ConflictException('Only creator can record ledger adjustments');

      const amount = Number(dto.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        throw new BadRequestException('Adjustment amount cannot be zero');
      }

      if (dto.participantId) {
        const [p]: any = await this.sequelize.query(
          `SELECT id FROM chit_participants WHERE id=:participantId AND chit_id=:chitId`,
          { replacements: { participantId: dto.participantId, chitId }, transaction },
        );
        if (!p.length) throw new NotFoundException('Participant not found in chit');
      }

      const [rows]: any = await this.sequelize.query(
        `INSERT INTO ledger_entries
         (id,chit_id,chit_participant_id,entry_type,amount,description,reference_type,reference_id,
          created_by,created_at,updated_at)
         VALUES(gen_random_uuid(),:chitId,:participantId,:type,:amount,:description,
                'MANUAL_ADJUSTMENT',gen_random_uuid(),:actor,NOW(),NOW())
         RETURNING *`,
        {
          replacements: {
            chitId,
            participantId: dto.participantId ?? null,
            type: dto.entryType,
            amount,
            description: dto.description,
            actor: actorUserId,
          },
          transaction,
        },
      );
      return rows[0];
    });
  }

  /**
   * Ledger source of truth:
   * - persisted ledger_entries (adjustments, settled payouts, future ledger writers)
   * - verified payments that do not yet have a corresponding PAYMENT ledger entry
   *
   * The fallback is intentionally read-time and idempotent. It repairs existing
   * chits/historical data without requiring a destructive migration or changing
   * payment behavior. Once a payment has a ledger entry, the NOT EXISTS clause
   * prevents it from appearing twice.
   */
  private ledgerQuery(participantFilter: string) {
    return `
      SELECT *
      FROM (
        SELECT
          le.id,
          le.chit_id,
          le.chit_month_id,
          le.chit_participant_id,
          le.entry_type,
          le.amount,
          le.description,
          le.reference_type,
          le.reference_id,
          le.created_by,
          le.created_at,
          le.updated_at
        FROM ledger_entries le
        WHERE le.chit_id=:chitId
          ${participantFilter}

        UNION ALL

        SELECT
          p.id,
          p.chit_id,
          p.chit_month_id,
          p.chit_participant_id,
          'CONTRIBUTION' AS entry_type,
          p.amount,
          'Contribution payment' AS description,
          'PAYMENT' AS reference_type,
          p.id AS reference_id,
          p.recorded_by AS created_by,
          COALESCE(p.verified_at,p.payment_date,p.created_at) AS created_at,
          p.updated_at
        FROM payments p
        WHERE p.chit_id=:chitId
          AND p.status='VERIFIED'
          ${participantFilter.replace(/le\./g, 'p.')}
          AND NOT EXISTS (
            SELECT 1
            FROM ledger_entries existing
            WHERE existing.reference_type='PAYMENT'
              AND existing.reference_id=p.id
          )
      ) ledger
      ORDER BY created_at ASC,id ASC
    `;
  }

  private withBalance(rows: any[]) {
    let balance = 0;
    return rows.map(row => {
      balance += Number(row.amount);
      return { ...row, runningBalance: balance };
    });
  }
}
