import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class PayoutFundedLaterService {
  constructor(private readonly sequelize: Sequelize) {}

  private async assertAccess(chitId: string, userId: string, transaction?: any) {
    const [access]: any = await this.sequelize.query(
      `SELECT c.id
       FROM chits c
       LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
       LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:userId
       WHERE c.id=:chitId
         AND (c.creator_id=:userId OR ca.can_manage_chit=true OR ca.can_collect_cash=true
              OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN'))
       LIMIT 1`,
      { replacements: { chitId, userId }, transaction },
    );
    if (!access.length) throw new ConflictException('Payout settlement permission is required for this chit');
  }

  async list(chitId: string, userId: string) {
    await this.assertAccess(chitId, userId);
    const [rows]: any = await this.sequelize.query(
      `SELECT p.*,u.name AS recipient_name,u.mobile_number AS recipient_mobile,
              COALESCE(ps.paid_amount,0)::numeric AS paid_amount,
              GREATEST(p.amount-COALESCE(ps.paid_amount,0),0)::numeric AS remaining_amount,
              COALESCE(ps.settlement_count,0)::int AS settlement_count,
              COALESCE(ps.settlements,'[]'::json) AS settlements
       FROM payouts p
       LEFT JOIN users u ON u.id=p.recipient_user_id
       LEFT JOIN LATERAL (
         SELECT SUM(s.amount)::numeric AS paid_amount,
                COUNT(*)::int AS settlement_count,
                json_agg(json_build_object(
                  'id',s.id,'amount',s.amount,'payment_method',s.payment_method,
                  'transaction_reference',s.transaction_reference,'notes',s.notes,
                  'recorded_by',s.recorded_by,'paid_at',s.paid_at
                ) ORDER BY s.paid_at,s.created_at) AS settlements
         FROM payout_settlements s WHERE s.payout_id=p.id
       ) ps ON true
       WHERE p.chit_id=:chitId
       ORDER BY p.created_at DESC`,
      { replacements: { chitId } },
    );
    return rows;
  }

  async addPartialSettlement(payoutId: string, actor: string, dto: any) {
    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT p.*,c.creator_id,c.accumulated_savings_amount
         FROM payouts p JOIN chits c ON c.id=p.chit_id
         WHERE p.id=:payoutId FOR UPDATE OF p,c`,
        { replacements: { payoutId }, transaction },
      );
      if (!rows.length) throw new NotFoundException('Payout not found');
      const p = rows[0];
      await this.assertAccess(p.chit_id, actor, transaction);
      if (!['PENDING','PARTIALLY_SETTLED'].includes(String(p.status)))
        throw new ConflictException(`Payout cannot accept another settlement while status is ${p.status}`);

      const amount = Number(dto.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Settlement amount must be greater than zero');
      const method = String(dto.paymentMethod || '').toUpperCase();
      if (!['CASH','UPI','BANK_TRANSFER'].includes(method)) throw new BadRequestException('Invalid payment method');
      const reference = String(dto.transactionReference || '').trim();
      if (!reference) throw new BadRequestException('Transaction / receipt reference is required');

      const [sumRows]: any = await this.sequelize.query(
        `SELECT COALESCE(SUM(amount),0)::numeric AS paid_amount FROM payout_settlements WHERE payout_id=:payoutId FOR UPDATE`,
        { replacements: { payoutId }, transaction },
      );
      const paid = Number(sumRows[0]?.paid_amount || 0);
      const total = Number(p.amount || 0);
      const remaining = Math.max(0, total - paid);
      if (remaining <= 0) throw new ConflictException('Payout is already fully settled');
      if (amount > remaining + 0.000001)
        throw new ConflictException(`Settlement exceeds remaining payout. Remaining ₹${remaining.toFixed(2)}.`);

      const [inserted]: any = await this.sequelize.query(
        `INSERT INTO payout_settlements
         (id,payout_id,amount,payment_method,transaction_reference,notes,recorded_by,paid_at,created_at,updated_at)
         VALUES(gen_random_uuid(),:payoutId,:amount,:method,:reference,:notes,:actor,NOW(),NOW(),NOW())
         RETURNING *`,
        { replacements: { payoutId, amount, method, reference, notes: dto.notes ?? null, actor }, transaction },
      );

      const newPaid = paid + amount;
      const fullySettled = newPaid >= total - 0.000001;
      const newStatus = fullySettled ? 'SETTLED' : 'PARTIALLY_SETTLED';
      const canonicalMethod = fullySettled
        ? (await this.countDistinctMethods(payoutId, transaction)) > 1 ? 'MULTIPLE' : method
        : 'MULTIPLE';

      await this.sequelize.query(
        `UPDATE payouts SET status=:status,
           payment_method=CASE WHEN :fully THEN :method ELSE 'MULTIPLE' END,
           transaction_reference=CASE WHEN :fully THEN :reference ELSE COALESCE(transaction_reference,'PARTIAL') END,
           paid_at=CASE WHEN :fully THEN NOW() ELSE paid_at END,
           notes=COALESCE(notes,'') || CASE WHEN :note='' THEN '' ELSE CASE WHEN COALESCE(notes,'')='' THEN :note ELSE E'\\n'||:note END END,
           updated_at=NOW()
         WHERE id=:payoutId`,
        { replacements: {
          payoutId, status: newStatus, fully: fullySettled, method: canonicalMethod,
          reference: fullySettled ? reference : 'PARTIAL',
          note: dto.notes ? `[Partial settlement] ${dto.notes}` : '',
        }, transaction },
      );

      if (fullySettled) {
        const [already]: any = await this.sequelize.query(
          `SELECT id FROM ledger_entries WHERE reference_type='PAYOUT' AND reference_id=:payoutId LIMIT 1`,
          { replacements: { payoutId }, transaction },
        );
        if (!already.length) {
          await this.sequelize.query(
            `INSERT INTO ledger_entries
             (id,chit_id,chit_month_id,chit_participant_id,entry_type,amount,description,reference_type,reference_id,created_by,created_at,updated_at)
             SELECT gen_random_uuid(),p.chit_id,p.chit_month_id,cp.id,'PAYOUT',-p.amount,
                    'Payout settled','PAYOUT',p.id,:actor,NOW(),NOW()
             FROM payouts p
             JOIN chit_participants cp ON cp.user_id=p.recipient_user_id AND cp.chit_id=p.chit_id
             WHERE p.id=:payoutId`,
            { replacements: { payoutId, actor }, transaction },
          );
        }
      }

      const [result]: any = await this.sequelize.query(
        `SELECT p.*,u.name AS recipient_name,u.mobile_number AS recipient_mobile,
                COALESCE((SELECT SUM(amount) FROM payout_settlements WHERE payout_id=p.id),0)::numeric AS paid_amount,
                GREATEST(p.amount-COALESCE((SELECT SUM(amount) FROM payout_settlements WHERE payout_id=p.id),0),0)::numeric AS remaining_amount
         FROM payouts p LEFT JOIN users u ON u.id=p.recipient_user_id WHERE p.id=:payoutId`,
        { replacements: { payoutId }, transaction },
      );
      return { ...result[0], settlement: inserted[0], paid_amount: Number(result[0].paid_amount), remaining_amount: Number(result[0].remaining_amount) };
    });
  }

  private async countDistinctMethods(payoutId: string, transaction: any) {
    const [rows]: any = await this.sequelize.query(
      `SELECT COUNT(DISTINCT payment_method)::int AS count FROM payout_settlements WHERE payout_id=:payoutId`,
      { replacements: { payoutId }, transaction },
    );
    return Number(rows[0]?.count || 0);
  }

  async settle(payoutId: string, actor: string, dto: any) {
    if (dto.status === 'FAILED') {
      return this.sequelize.transaction(async transaction => {
        const [rows]: any = await this.sequelize.query(`SELECT p.* FROM payouts p WHERE p.id=:payoutId FOR UPDATE`, { replacements:{payoutId}, transaction });
        if (!rows.length) throw new NotFoundException('Payout not found');
        await this.assertAccess(rows[0].chit_id, actor, transaction);
        if (rows[0].status === 'SETTLED') throw new ConflictException('Payout already settled');
        const [updated]: any = await this.sequelize.query(
          `UPDATE payouts SET status='FAILED',payment_method=:method,transaction_reference=:reference,paid_at=NOW(),notes=COALESCE(:notes,notes),updated_at=NOW() WHERE id=:payoutId RETURNING *`,
          { replacements:{payoutId,method:dto.paymentMethod,reference:String(dto.transactionReference||'').trim(),notes:dto.notes??null}, transaction });
        return updated[0];
      });
    }
    const [rows]: any = await this.sequelize.query(`SELECT amount,COALESCE((SELECT SUM(amount) FROM payout_settlements WHERE payout_id=payouts.id),0) paid FROM payouts WHERE id=:payoutId`, { replacements:{payoutId} });
    if (!rows.length) throw new NotFoundException('Payout not found');
    const remaining = Number(rows[0].amount)-Number(rows[0].paid);
    return this.addPartialSettlement(payoutId, actor, { ...dto, amount: remaining });
  }
}
