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

      // Never allow a second Agent Chit payment for the same month. This also
      // protects legacy rows whose notes were changed after settlement.
      const [existingAgentSettlement]: any = await this.sequelize.query(
        `SELECT settled.id
         FROM chit_months m
         LEFT JOIN agents a ON a.id=m.agent_id
         JOIN payouts current_p ON current_p.id=:payoutId
         JOIN payouts settled ON settled.chit_month_id=m.id AND settled.status='SETTLED'
         WHERE m.id=:monthId
           AND m.month_type='AGENT_CHIT'
           AND (
             current_p.notes LIKE 'AGENT_CHIT:%'
             OR current_p.recipient_agent_id=m.agent_id
             OR current_p.recipient_user_id=a.user_id
           )
           AND settled.id<>current_p.id
           AND (
             settled.notes LIKE 'AGENT_CHIT:%'
             OR settled.recipient_agent_id=m.agent_id
             OR settled.recipient_user_id=a.user_id
           )
         LIMIT 1`,
        { replacements: { monthId: p.chit_month_id, payoutId }, transaction },
      );
      if (existingAgentSettlement.length)
        throw new ConflictException('Agent payout is already settled for this month');

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

        // Preserve the payout's business classification. The mobile client may
        // send a human settlement note, but replacing an AGENT_CHIT marker with
        // that note makes the already-settled payout invisible to Agent Month
        // and allows a stale PENDING row to appear actionable again.
        const settlementNotes =
          dto.notes == null
            ? p.notes
            : `${String(p.notes || '').trim()}${p.notes ? ' | ' : ''}Settlement: ${String(dto.notes).trim()}`;

        const [updated]: any = await this.sequelize.query(
          `UPDATE payouts
           SET status=:status,
               payment_method=:method,
               transaction_reference=:reference,
               paid_at=NOW(),
               notes=:notes,
               updated_at=NOW()
           WHERE id=:payoutId
           RETURNING *`,
          {
            replacements: {
              payoutId,
              status: dto.status,
              method: dto.paymentMethod,
              reference: dto.transactionReference,
              notes: settlementNotes,
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

        // An AGENT_CHIT month must have exactly one effective payout.
        // Match both the explicit AGENT_CHIT marker and the configured agent
        // recipient so this also repairs legacy rows whose notes were replaced
        // by a generic settlement note.
        const [agentMonthRows]: any = await this.sequelize.query(
          `SELECT m.agent_id, a.user_id AS agent_user_id
           FROM chit_months m
           LEFT JOIN agents a ON a.id=m.agent_id
           WHERE m.id=:monthId
             AND m.month_type='AGENT_CHIT'
           LIMIT 1`,
          { replacements: { monthId: p.chit_month_id }, transaction },
        );

        if (agentMonthRows.length) {
          const agentId = agentMonthRows[0].agent_id;
          const agentUserId = agentMonthRows[0].agent_user_id;

          await this.sequelize.query(
            `UPDATE payouts stale
             SET status='FAILED',
                 paid_at=NULL,
                 notes=CONCAT(COALESCE(stale.notes,''),' | SUPERSEDED_BY_SETTLED_PAYOUT:',:payoutId),
                 updated_at=NOW()
             WHERE stale.chit_month_id=:monthId
               AND stale.status='PENDING'
               AND stale.id<>:payoutId
               AND (
                 stale.notes LIKE 'AGENT_CHIT:%'
                 OR (:agentId IS NOT NULL AND stale.recipient_agent_id=:agentId)
                 OR (:agentUserId IS NOT NULL AND stale.recipient_user_id=:agentUserId)
               )`,
            { replacements: { monthId: p.chit_month_id, payoutId, agentId, agentUserId }, transaction },
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
            { replacements: { actor, payoutId, data: JSON.stringify({ settledPayoutId: payoutId, agentId, agentUserId }) }, transaction },
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
