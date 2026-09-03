import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class PayoutFundedLaterService {
  constructor(private readonly sequelize: Sequelize) {}

  async list(chitId: string, userId: string) {
    const [access]: any = await this.sequelize.query(
      `SELECT c.id
       FROM chits c
       LEFT JOIN chit_agent_assignments ca
         ON ca.chit_id=c.id AND ca.active=true
       LEFT JOIN agents ag
         ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:userId
       WHERE c.id=:chitId
         AND (c.creator_id=:userId OR ca.can_manage_chit=true OR ca.can_collect_cash=true OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN'))
       LIMIT 1`,
      { replacements: { chitId, userId } },
    );
    if (!access.length)
      throw new ConflictException('Payout register permission is required for this chit');

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
        `SELECT p.*,c.creator_id,c.accumulated_savings_amount,
                c.total_members
         FROM payouts p
         JOIN chits c ON c.id=p.chit_id
         WHERE p.id=:payoutId
         FOR UPDATE OF p,c`,
        { replacements: { payoutId }, transaction },
      );

      if (!rows.length) throw new NotFoundException('Payout not found');
      const p = rows[0];

      const [actorAccess]: any = await this.sequelize.query(
        `SELECT 1
         FROM chits c
         LEFT JOIN chit_agent_assignments ca
           ON ca.chit_id=c.id AND ca.active=true
         LEFT JOIN agents ag
           ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:actor
         WHERE c.id=:chitId
           AND (c.creator_id=:actor OR ca.can_manage_chit=true OR ca.can_collect_cash=true OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:actor AND ur.role='ADMIN'))
         LIMIT 1`,
        { replacements: { chitId: p.chit_id, actor }, transaction },
      );
      if (!actorAccess.length)
        throw new ConflictException('Payout settlement permission is required for this chit');

      if (!['SETTLED', 'FAILED'].includes(dto.status))
        throw new BadRequestException('Invalid payout status');

      if (p.status === 'SETTLED')
        throw new ConflictException('Payout already settled');

      /*
       * A payout may be CREATED before members have paid.
       * It must NOT be SETTLED until the creator has enough verified funds.
       * Cash and UPI are both valid: the source is irrelevant after payment
       * verification; verified payments are summed by amount.
       */
      if (dto.status === 'SETTLED') {
        const [collectionRows]: any = await this.sequelize.query(
          `SELECT
             COALESCE(SUM(amount),0)::numeric AS collected
           FROM payments
           WHERE chit_id=:chitId
             AND chit_month_id=:monthId
             AND status IN ('VERIFIED','PAID','SETTLED','COMPLETED')`,
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
          `SELECT auction_type,COALESCE(discount_amount,0)::numeric AS discount_amount
           FROM auctions
           WHERE chit_month_id=:monthId AND status='COMPLETED'
           ORDER BY completed_at DESC LIMIT 1`,
          {replacements:{monthId:p.chit_month_id},transaction},
        );
        const auction=auctionRows[0]??null;
        const auctionDiscount=Number(auction?.discount_amount||0);
        const additionalAuction=auction?.auction_type==='ADDITIONAL';

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
          openingSavings + collected + (additionalAuction ? auctionDiscount : 0) - otherSettledPayouts;

        if (available < Number(p.amount)) {
          throw new ConflictException(
            `Insufficient verified funds to settle payout. Required ₹${Number(
              p.amount,
            ).toFixed(2)}, available ₹${available.toFixed(
              2,
            )} including previous savings. ` +
              `Verified collections so far: ₹${collected.toFixed(2)}.`,
          );
        }

        const closingSavings = available - Number(p.amount);
        const delta = closingSavings - openingSavings;

        /*
         * Update the canonical chit savings balance only when the payout
         * actually settles. This prevents a premature draw from consuming
         * savings before cash/UPI collections have arrived.
         */
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
                  : (auction ? 'MONTHLY_AUCTION_DISCOUNT' : (delta >= 0 ? 'FIXED_DRAW_SURPLUS' : 'FIXED_DRAW_SAVINGS_USED')),
                amount: delta,
                balance: closingSavings,
                actor,
                notes:
                  `${additionalAuction ? 'Additional auction' : auction ? 'Auction' : 'Fixed draw'} payout settlement: verified collections ₹${collected.toFixed(
                    2,
                  )} + opening savings ₹${openingSavings.toFixed(
                    2,
                  )}${additionalAuction ? ` + auction discount ₹${auctionDiscount.toFixed(2)}` : ''} - settled payout ₹${Number(p.amount).toFixed(
                    2,
                  )} = closing savings ₹${closingSavings.toFixed(2)}`,
              },
              transaction,
            },
          );
        }

        const [updated]: any = await this.sequelize.query(
          `UPDATE payouts
           SET status=:status,
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
              status: dto.status,
              method: dto.paymentMethod,
              reference: dto.transactionReference,
              notes: dto.notes ?? null,
            },
            transaction,
          },
        );

        const [already]: any = await this.sequelize.query(
          `SELECT id
           FROM ledger_entries
           WHERE reference_type='PAYOUT'
             AND reference_id=:payoutId
           LIMIT 1`,
          { replacements: { payoutId }, transaction },
        );

        if (already.length)
          throw new ConflictException('Payout ledger entry already exists');

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

        // An AGENT_CHIT month must have exactly one effective payout. Older
        // versions could leave a duplicate PENDING payout behind after a
        // successful settlement. That stale row would incorrectly block
        // Month Close and would keep a second Settle button visible.
        if (String(p.notes || '').startsWith('AGENT_CHIT:')) {
          await this.sequelize.query(
            `UPDATE payouts
             SET status='FAILED',
                 paid_at=NULL,
                 notes=CONCAT(COALESCE(notes,''),' | SUPERSEDED_BY_SETTLED_PAYOUT:',:payoutId),
                 updated_at=NOW()
             WHERE chit_month_id=:monthId
               AND status='PENDING'
               AND id<>:payoutId
               AND notes LIKE 'AGENT_CHIT:%'`,
            { replacements: { monthId: p.chit_month_id, payoutId }, transaction },
          );
          await this.sequelize.query(
            `INSERT INTO audit_logs
             (id,actor_user_id,chit_id,action,entity_type,entity_id,after_data,created_at,updated_at)
             SELECT gen_random_uuid(),:actor,p.chit_id,'AGENT_CHIT_DUPLICATE_PENDING_SUPERSEDED',
                    'PAYOUT',q.id,:data,NOW(),NOW()
             FROM payouts q
             JOIN payouts p ON p.id=:payoutId
             WHERE q.chit_month_id=p.chit_month_id
               AND q.status='FAILED'
               AND q.notes LIKE CONCAT('%SUPERSEDED_BY_SETTLED_PAYOUT:',:payoutId)`,
            { replacements: { actor, payoutId, data: JSON.stringify({ settledPayoutId: payoutId }) }, transaction },
          );
        }

        return {
          ...updated[0],
          financial: {
            verifiedCollections: collected,
            openingSavings,
            payoutAmount: Number(p.amount),
            closingSavings,
            auctionDiscount,
            additionalAuction,
          },
        };
      }

      const [updated]: any = await this.sequelize.query(
        `UPDATE payouts
         SET status=:status,
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
            status: dto.status,
            method: dto.paymentMethod,
            reference: dto.transactionReference,
            notes: dto.notes ?? null,
          },
          transaction,
        },
      );

      return updated[0];
    });
  }
}
