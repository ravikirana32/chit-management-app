import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { randomInt } from 'crypto';
import { FixedDrawService } from './fixed-draw.service';
import { OperationSchedulePolicyService } from '../../common/enterprise-hardening/operation-schedule-policy.service';

@Injectable()
export class FixedDrawFundedLaterService extends FixedDrawService {
  constructor(
    private readonly db: Sequelize,
    schedulePolicy: OperationSchedulePolicyService,
  ) {
    super(db, schedulePolicy);
  }

  /**
   * FIXED_DRAW rule:
   * - Selecting a winner is independent from collecting the month's contributions.
   * - The run operation creates a PENDING payout.
   * - Actual cash/UPI collection is verified later.
   * - Funds are checked when the payout is SETTLED, not when the winner is selected.
   * - Savings are updated only after settlement, using verified collections + opening savings - payout.
   */
  async runDraw(chitId: string, monthId: string, actorUserId: string): Promise<any> {
    return this.db.transaction(async transaction => {
      const [monthRows]: any = await this.db.query(
        `SELECT m.*, c.creator_id, c.status AS chit_status, c.chit_type,
                c.total_members, c.accumulated_savings_amount, c.total_chit_amount
         FROM chit_months m
         JOIN chits c ON c.id=m.chit_id
         WHERE m.id=:monthId AND m.chit_id=:chitId
         FOR UPDATE OF m,c`,
        { replacements: { chitId, monthId }, transaction },
      );

      if (!monthRows.length) throw new NotFoundException('Chit month not found');
      const m = monthRows[0];

      const [creatorAccess]: any = await this.db.query(
        `SELECT 1 FROM chits WHERE id=:chitId AND creator_id=:userId LIMIT 1`,
        { replacements: { chitId, userId: actorUserId }, transaction },
      );
      if (!creatorAccess.length) {
        const [adminAccess]: any = await this.db.query(
          `SELECT 1 FROM user_roles WHERE user_id=:userId AND role='ADMIN' LIMIT 1`,
          { replacements: { userId: actorUserId }, transaction },
        );
        if (!adminAccess.length) {
          const [agentAccess]: any = await this.db.query(
            `SELECT 1
             FROM chit_agent_assignments ca
             JOIN agents ag ON ag.id=ca.agent_id
             WHERE ca.chit_id=:chitId
               AND ag.user_id=:userId
               AND ca.active=true
               AND ca.can_run_draw=true
               AND ag.status='ACTIVE'
             LIMIT 1`,
            { replacements: { chitId, userId: actorUserId }, transaction },
          );
          if (!agentAccess.length)
            throw new ConflictException('Fixed draw permission is required for this chit');
        }
      }

      if (m.chit_type !== 'FIXED_DRAW')
        throw new BadRequestException('This endpoint is only for FIXED_DRAW chits');
      if (m.month_type === 'AGENT_CHIT')
        throw new BadRequestException('AGENT_CHIT month has no draw; use the agent payout endpoint');
      if (!['READY_FOR_ACTION', 'SCHEDULED', 'COLLECTION'].includes(m.status))
        throw new ConflictException('Month is not ready for draw');

      const [drawRows]: any = await this.db.query(
        `SELECT * FROM draws WHERE chit_month_id=:monthId FOR UPDATE`,
        { replacements: { monthId }, transaction },
      );
      if (!drawRows.length)
        throw new ConflictException('Open the fixed draw before running it');

      const draw = drawRows[0];
      if (draw.status === 'COMPLETED')
        throw new ConflictException('Draw is already completed');

      const now = new Date();
      if (draw.scheduled_at && now < new Date(draw.scheduled_at))
        throw new ConflictException('Draw time has not arrived');

      const [eligible]: any = await this.db.query(
        `SELECT dp.*, cp.user_id
         FROM draw_participants dp
         JOIN chit_participants cp ON cp.id=dp.chit_participant_id
         WHERE dp.draw_id=:drawId
           AND dp.eligibility_status='ELIGIBLE'
         ORDER BY dp.participant_sequence
         FOR UPDATE OF dp`,
        { replacements: { drawId: draw.id }, transaction },
      );

      if (!eligible.length)
        throw new BadRequestException('No eligible participants remain');

      const interested = eligible.filter(
        (p: any) => p.interest_status === 'INTERESTED',
      );
      const pool = interested.length ? interested : eligible;
      const selected = pool[randomInt(pool.length)];
      const winnerId = selected.chit_participant_id;
      const fallbackToAllEligible = interested.length === 0;

      const winnerPayout = Number(
        m.winner_payout_amount ?? m.scheduled_amount,
      );
      if (!Number.isFinite(winnerPayout) || winnerPayout <= 0)
        throw new BadRequestException('Invalid fixed draw winner payout amount');

      const [winnerRows]: any = await this.db.query(
        `INSERT INTO draw_winners
         (id,draw_id,chit_participant_id,selected_at,selection_method,
          result_reference,created_at,updated_at)
         VALUES
         (gen_random_uuid(),:drawId,:pid,NOW(),'RANDOM',:ref,NOW(),NOW())
         RETURNING *`,
        {
          replacements: {
            drawId: draw.id,
            pid: winnerId,
            ref: `DRAW-${draw.id}`,
          },
          transaction,
        },
      );

      const [payoutRows]: any = await this.db.query(
        `INSERT INTO payouts
         (id,chit_id,chit_month_id,recipient_user_id,amount,
          payment_method,status,recorded_by,notes,created_at,updated_at)
         SELECT
           gen_random_uuid(),:chitId,:monthId,cp.user_id,:amount,
           'UPI','PENDING',:actor,
           :notes,NOW(),NOW()
         FROM chit_participants cp
         WHERE cp.id=:pid
         RETURNING *`,
        {
          replacements: {
            chitId,
            monthId,
            pid: winnerId,
            amount: winnerPayout,
            actor: actorUserId,
            notes:
              `FIXED_DRAW:PENDING_COLLECTION; winner payout ₹${winnerPayout.toFixed(2)}; ` +
              `collections are reconciled before settlement`,
          },
          transaction,
        },
      );

      if (!payoutRows.length)
        throw new ConflictException('Unable to create winner payout');

      await this.db.query(
        `UPDATE draws
         SET status='COMPLETED',
             completed_at=NOW(),
             updated_at=NOW()
         WHERE id=:drawId`,
        { replacements: { drawId: draw.id }, transaction },
      );

      await this.db.query(
        `UPDATE chit_months
         SET status='COMPLETED',
             updated_at=NOW()
         WHERE id=:monthId`,
        { replacements: { monthId }, transaction },
      );

      await this.db.query(
        `UPDATE chits
         SET completed_months=(
               SELECT COUNT(*) FROM chit_months
               WHERE chit_id=:chitId AND status='COMPLETED'
             ),
             status=CASE
               WHEN (
                 SELECT COUNT(*) FROM chit_months
                 WHERE chit_id=:chitId AND status='COMPLETED'
               ) >= total_months
               THEN 'COMPLETED'
               ELSE status
             END,
             completed_at=CASE
               WHEN (
                 SELECT COUNT(*) FROM chit_months
                 WHERE chit_id=:chitId AND status='COMPLETED'
               ) >= total_months
               THEN NOW()
               ELSE completed_at
             END,
             updated_at=NOW()
         WHERE id=:chitId`,
        { replacements: { chitId }, transaction },
      );

      await this.db.query(
        `INSERT INTO audit_logs
         (id,actor_user_id,chit_id,action,entity_type,entity_id,
          after_data,created_at,updated_at)
         VALUES
         (gen_random_uuid(),:actor,:chitId,'FIXED_DRAW_WINNER_SELECTED',
          'CHIT_MONTH',:monthId,:data,NOW(),NOW())`,
        {
          replacements: {
            actor: actorUserId,
            chitId,
            monthId,
            data: JSON.stringify({
              drawId: draw.id,
              winnerParticipantId: winnerId,
              eligibleCount: eligible.length,
              interestedCount: interested.length,
              fallbackToAllEligible,
              monthlyContributionPerMember: Number(m.scheduled_amount),
              expectedCollection:
                Number(m.scheduled_amount) * Number(m.total_members),
              winnerPayout,
              openingSavings: Number(m.accumulated_savings_amount || 0),
              collectionRequiredBeforeSettlement: winnerPayout,
              financialSettlementDeferred: true,
            }),
          },
          transaction,
        },
      );

      return {
        success: true,
        drawId: draw.id,
        winnerParticipantId: winnerId,
        winner: winnerRows[0],
        payout: payoutRows[0],
        eligibleCount: eligible.length,
        interestedCount: interested.length,
        fallbackToAllEligible,
        scheduledAmount: Number(m.scheduled_amount),
        winnerPayoutAmount: winnerPayout,
        openingSavings: Number(m.accumulated_savings_amount || 0),
        collectedAmountAtSelection: 0,
        financialSettlementDeferred: true,
        rule:
          'Winner is selected first. Members may pay by cash or UPI afterwards. ' +
          'Payout can be settled only when verified collections plus opening savings are sufficient. ' +
          'Winner remains active and continues future contributions.',
        nextStep:
          'Collect and verify the monthly contributions, then settle the pending payout.',
      };
    });
  }
}
