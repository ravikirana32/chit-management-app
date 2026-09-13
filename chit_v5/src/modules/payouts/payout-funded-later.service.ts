import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class PayoutFundedLaterService {
  constructor(private readonly sequelize: Sequelize) {}

  async list(chitId: string, userId: string) {
    const [access]: any = await this.sequelize.query(
      `SELECT c.id
       FROM chits c
       WHERE c.id=:chitId
         AND (
           c.creator_id=:userId
           OR EXISTS (
             SELECT 1
             FROM user_roles ur
             WHERE ur.user_id=:userId AND ur.role='ADMIN'
           )
           OR EXISTS (
             SELECT 1
             FROM chit_agent_assignments ca
             JOIN agents ag ON ag.id=ca.agent_id
             WHERE ca.chit_id=c.id
               AND ca.active=true
               AND ca.can_manage_chit=true
               AND ag.user_id=:userId
               AND ag.status='ACTIVE'
           )
           OR EXISTS (
             SELECT 1
             FROM chit_agent_assignments ca
             JOIN agents ag ON ag.id=ca.agent_id
             WHERE ca.chit_id=c.id
               AND ca.active=true
               AND ca.can_collect_cash=true
               AND ag.user_id=:userId
               AND ag.status='ACTIVE'
           )
         )
       LIMIT 1`,
      { replacements: { chitId, userId } },
    );

    if (!access.length) {
      throw new ConflictException(
        'Payout register permission is required for this chit',
      );
    }

    const [rows]: any = await this.sequelize.query(
      `SELECT p.*,
              u.name AS recipient_name,
              u.mobile_number AS recipient_mobile
       FROM payouts p
       JOIN users u ON u.id=p.recipient_user_id
       WHERE p.chit_id=:chitId
       ORDER BY p.created_at DESC`,
      { replacements: { chitId } },
    );

    const payoutIds = rows.map((x: any) => x.id);
    let components: any[] = [];

    if (payoutIds.length) {
      const [componentRows]: any = await this.sequelize.query(
        `SELECT *
         FROM payout_transactions
         WHERE payout_id IN (:payoutIds)
         ORDER BY created_at`,
        { replacements: { payoutIds } },
      );
      components = componentRows;
    }

    return rows.map((p: any) => ({
      ...p,
      components: components
        .filter((c: any) => c.payout_id === p.id)
        .map((c: any) => ({
          id: c.id,
          payoutId: c.payout_id,
          amount: Number(c.amount),
          paymentMethod: c.payment_method,
          transactionReference: c.transaction_reference,
          status: c.status,
          paidAt: c.paid_at,
          recordedBy: c.recorded_by,
          notes: c.notes,
          createdAt: c.created_at,
        })),
    }));
  }

  private normalizeComponents(dto: any, payoutAmount: number) {
    const supplied = Array.isArray(dto.components) ? dto.components : [];

    if (!supplied.length) {
      if (!dto.paymentMethod || !dto.transactionReference?.trim()) {
        throw new BadRequestException(
          'Payment method and transaction reference are required for a full payout settlement',
        );
      }

      return [
        {
          amount: payoutAmount,
          paymentMethod: String(dto.paymentMethod).toUpperCase(),
          transactionReference: dto.transactionReference.trim(),
          notes: dto.notes ?? null,
        },
      ];
    }

    const components = supplied.map((c: any) => ({
      amount: Number(c.amount),
      paymentMethod: String(c.paymentMethod || '').toUpperCase(),
      transactionReference: c.transactionReference?.trim() || null,
      notes: c.notes ?? dto.notes ?? null,
    }));

    if (!components.length) {
      throw new BadRequestException('At least one payout component is required');
    }

    for (const c of components) {
      if (!Number.isFinite(c.amount) || c.amount <= 0) {
        throw new BadRequestException(
          'Each payout component amount must be greater than zero',
        );
      }

      if (!['CASH', 'UPI', 'BANK_TRANSFER'].includes(c.paymentMethod)) {
        throw new BadRequestException(
          'Payout component method must be CASH, UPI or BANK_TRANSFER',
        );
      }

      if (!c.transactionReference) {
        throw new BadRequestException(
          `Transaction/reference is required for ${c.paymentMethod} payout component`,
        );
      }
    }

    const total = components.reduce(
      (sum: number, c: any) => sum + c.amount,
      0,
    );

    if (Math.abs(total - payoutAmount) > 0.000001) {
      throw new ConflictException(
        `Payout components must total exactly ₹${payoutAmount.toFixed(
          2,
        )}. Supplied ₹${total.toFixed(2)}.`,
      );
    }

    return components;
  }

  async settle(payoutId: string, actor: string, dto: any) {
    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT p.*,c.creator_id,c.accumulated_savings_amount,
                c.total_members,m.status AS month_status
         FROM payouts p
         JOIN chits c ON c.id=p.chit_id
         LEFT JOIN chit_months m ON m.id=p.chit_month_id
         WHERE p.id=:payoutId
         FOR UPDATE OF p,c,m`,
        { replacements: { payoutId }, transaction },
      );

      if (!rows.length) throw new NotFoundException('Payout not found');
      const p = rows[0];

      const monthStatus = String(p.month_status || '').toUpperCase();
      if (['LOCKED', 'CLOSED', 'CANCELLED'].includes(monthStatus)) {
        throw new ConflictException(
          'This month is already closed/locked. Payout settlement cannot be changed.',
        );
      }

      const [actorAccess]: any = await this.sequelize.query(
        `SELECT 1
         FROM chits c
         WHERE c.id=:chitId
           AND (
             c.creator_id=:actor
             OR EXISTS (
               SELECT 1
               FROM user_roles ur
               WHERE ur.user_id=:actor AND ur.role='ADMIN'
             )
             OR EXISTS (
               SELECT 1
               FROM chit_agent_assignments ca
               JOIN agents ag ON ag.id=ca.agent_id
               WHERE ca.chit_id=c.id
                 AND ca.active=true
                 AND ca.can_manage_chit=true
                 AND ag.user_id=:actor
                 AND ag.status='ACTIVE'
             )
             OR EXISTS (
               SELECT 1
               FROM chit_agent_assignments ca
               JOIN agents ag ON ag.id=ca.agent_id
               WHERE ca.chit_id=c.id
                 AND ca.active=true
                 AND ca.can_collect_cash=true
                 AND ag.user_id=:actor
                 AND ag.status='ACTIVE'
             )
           )
         LIMIT 1`,
        { replacements: { chitId: p.chit_id, actor }, transaction },
      );

      if (!actorAccess.length) {
        throw new ConflictException(
          'Payout settlement permission is required for this chit',
        );
      }

      if (!['SETTLED', 'FAILED'].includes(dto.status)) {
        throw new BadRequestException('Invalid payout status');
      }

      if (p.status === 'SETTLED') {
        throw new ConflictException('Payout already settled');
      }

      if (dto.status === 'FAILED') {
        const [updated]: any = await this.sequelize.query(
          `UPDATE payouts
           SET status='FAILED',
               payment_method=:method,
               transaction_reference=:reference,
               paid_at=NOW(),
               notes=COALESCE(:notes,notes),
               updated_at=NOW()
           WHERE id=:payoutId
           RETURNING *`,
          {
            replacements: {
              payoutId,
              method: dto.paymentMethod ?? null,
              reference: dto.transactionReference ?? null,
              notes: dto.notes ?? null,
            },
            transaction,
          },
        );
        return updated[0];
      }

      const payoutAmount = Number(p.amount);
      if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
        throw new ConflictException('Payout amount is invalid');
      }

      const components = this.normalizeComponents(dto, payoutAmount);

      const [collectionRows]: any = await this.sequelize.query(
        `SELECT COALESCE(SUM(amount),0)::numeric AS collected
         FROM payments
         WHERE chit_id=:chitId
           AND chit_month_id=:monthId
           AND status='VERIFIED'`,
        {
          replacements: {
            chitId: p.chit_id,
            monthId: p.chit_month_id,
          },
          transaction,
        },
      );

      const collected = Number(collectionRows[0]?.collected || 0);
      const openingSavings = Number(p.accumulated_savings_amount || 0);

      const [auctionRows]: any = await this.sequelize.query(
        `SELECT auction_type,
                COALESCE(discount_amount,0)::numeric AS discount_amount
         FROM auctions
         WHERE chit_month_id=:monthId
           AND status='COMPLETED'
         ORDER BY completed_at DESC
         LIMIT 1`,
        { replacements: { monthId: p.chit_month_id }, transaction },
      );

      const auction = auctionRows[0] ?? null;
      const auctionDiscount = Number(auction?.discount_amount || 0);
      const additionalAuction = auction?.auction_type === 'ADDITIONAL';

      const [otherSettledRows]: any = await this.sequelize.query(
        `SELECT COALESCE(SUM(amount),0)::numeric AS amount
         FROM payouts
         WHERE chit_month_id=:monthId
           AND status='SETTLED'
           AND id<>:payoutId`,
        {
          replacements: {
            monthId: p.chit_month_id,
            payoutId,
          },
          transaction,
        },
      );

      const otherSettledPayouts = Number(
        otherSettledRows[0]?.amount || 0,
      );

      const available =
        openingSavings +
        collected +
        (additionalAuction ? auctionDiscount : 0) -
        otherSettledPayouts;

      if (available + 0.000001 < payoutAmount) {
        throw new ConflictException(
          `Insufficient verified funds to settle payout. Required ₹${payoutAmount.toFixed(
            2,
          )}, available ₹${available.toFixed(
            2,
          )}. Verified collections: ₹${collected.toFixed(2)}.`,
        );
      }

      const closingSavings = available - payoutAmount;
      const delta = closingSavings - openingSavings;

      await this.sequelize.query(
        `UPDATE chits
         SET accumulated_savings_amount=:balance,
             updated_at=NOW()
         WHERE id=:chitId`,
        {
          replacements: {
            chitId: p.chit_id,
            balance: closingSavings,
          },
          transaction,
        },
      );

      if (Math.abs(delta) > 0.000001) {
        await this.sequelize.query(
          `INSERT INTO chit_savings_transactions
           (id,chit_id,chit_month_id,transaction_type,amount,
            balance_after,agent_user_id,notes,created_at,updated_at)
           VALUES
           (gen_random_uuid(),:chitId,:monthId,:type,:amount,
            :balance,:actor,:notes,NOW(),NOW())`,
          {
            replacements: {
              chitId: p.chit_id,
              monthId: p.chit_month_id,
              type: additionalAuction
                ? 'ADDITIONAL_AUCTION_NET'
                : auction
                  ? 'MONTHLY_AUCTION_DISCOUNT'
                  : delta >= 0
                    ? 'FIXED_DRAW_SURPLUS'
                    : 'FIXED_DRAW_SAVINGS_USED',
              amount: delta,
              balance: closingSavings,
              actor,
              notes:
                `${additionalAuction ? 'Additional auction' : auction ? 'Auction' : 'Fixed draw'} payout settlement: verified collections ₹${collected.toFixed(
                  2,
                )} + opening savings ₹${openingSavings.toFixed(
                  2,
                )}${additionalAuction ? ` + auction discount ₹${auctionDiscount.toFixed(2)}` : ''} - settled payout ₹${payoutAmount.toFixed(
                  2,
                )} = closing savings ₹${closingSavings.toFixed(2)}`,
            },
            transaction,
          },
        );
      }

      const parentMethod =
        components.length === 1 ? components[0].paymentMethod : 'SPLIT';
      const parentReference =
        components.length === 1
          ? components[0].transactionReference
          : components
              .map(
                (c: any) =>
                  `${c.paymentMethod}:${c.transactionReference}`,
              )
              .join(' | ');

      const [updated]: any = await this.sequelize.query(
        `UPDATE payouts
         SET status='SETTLED',
             payment_method=:method,
             transaction_reference=:reference,
             paid_at=NOW(),
             notes=COALESCE(:notes,notes),
             updated_at=NOW()
         WHERE id=:payoutId
         RETURNING *`,
        {
          replacements: {
            payoutId,
            method: parentMethod,
            reference: parentReference,
            notes: dto.notes ?? null,
          },
          transaction,
        },
      );

      for (const component of components) {
        await this.sequelize.query(
          `INSERT INTO payout_transactions
           (id,payout_id,amount,payment_method,transaction_reference,
            status,paid_at,recorded_by,notes,created_at,updated_at)
           VALUES
           (gen_random_uuid(),:payoutId,:amount,:method,:reference,
            'SETTLED',NOW(),:actor,:notes,NOW(),NOW())`,
          {
            replacements: {
              payoutId,
              amount: component.amount,
              method: component.paymentMethod,
              reference: component.transactionReference,
              actor,
              notes: component.notes,
            },
            transaction,
          },
        );
      }

      const [already]: any = await this.sequelize.query(
        `SELECT id
         FROM ledger_entries
         WHERE reference_type='PAYOUT'
           AND reference_id=:payoutId
         LIMIT 1`,
        { replacements: { payoutId }, transaction },
      );

      if (!already.length) {
        await this.sequelize.query(
          `INSERT INTO ledger_entries
           (id,chit_id,chit_month_id,chit_participant_id,entry_type,amount,
            description,reference_type,reference_id,created_by,
            created_at,updated_at)
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

      return {
        ...updated[0],
        components: components.map((c: any) => ({
          amount: c.amount,
          paymentMethod: c.paymentMethod,
          transactionReference: c.transactionReference,
        })),
        financial: {
          verifiedCollections: collected,
          openingSavings,
          payoutAmount,
          closingSavings,
          auctionDiscount,
          additionalAuction,
        },
      };
    });
  }
}
