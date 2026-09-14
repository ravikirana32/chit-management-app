import { ConflictException, Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

/**
 * Draw/Auction financial gate.
 * A winner may only be selected after every active member's monthly
 * contribution is fully verified. This is deliberately server-side so the
 * mobile UI cannot bypass the rule.
 */
@Injectable()
export class VerifiedContributionGateService {
  constructor(private readonly db: Sequelize) {}

  async assertFullyVerified(chitId: string, monthId: string, transaction?: any) {
    const [monthRows]: any = await this.db.query(
      `SELECT m.id,m.scheduled_amount,m.status,c.total_members
       FROM chit_months m
       JOIN chits c ON c.id=m.chit_id
       WHERE m.id=:monthId AND m.chit_id=:chitId
       FOR UPDATE OF m`,
      { replacements: { chitId, monthId }, transaction },
    );

    if (!monthRows.length) {
      throw new ConflictException('Chit month not found');
    }

    const month = monthRows[0];

    const [obligationRows]: any = await this.db.query(
      `SELECT
         COUNT(*)::int AS active_members,
         COUNT(o.id)::int AS obligations,
         COUNT(*) FILTER (
           WHERE o.id IS NULL OR o.status <> 'PAID' OR COALESCE(o.outstanding_amount,0) > 0
         )::int AS unresolved,
         COALESCE(SUM(o.due_amount),0)::numeric AS expected_amount,
         COALESCE(SUM(o.paid_amount),0)::numeric AS obligation_paid_amount
       FROM chit_participants cp
       LEFT JOIN contribution_obligations o
         ON o.chit_participant_id=cp.id
        AND o.chit_month_id=:monthId
       WHERE cp.chit_id=:chitId AND cp.status='ACTIVE'`,
      { replacements: { chitId, monthId }, transaction },
    );

    const summary = obligationRows[0];
    const activeMembers = Number(summary.active_members || 0);
    const obligations = Number(summary.obligations || 0);
    const unresolved = Number(summary.unresolved || 0);

    const [submittedRows]: any = await this.db.query(
      `SELECT COUNT(*)::int AS count
       FROM payments
       WHERE chit_id=:chitId
         AND chit_month_id=:monthId
         AND status='SUBMITTED'`,
      { replacements: { chitId, monthId }, transaction },
    );
    const submitted = Number(submittedRows[0]?.count || 0);

    const [verifiedRows]: any = await this.db.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS amount
       FROM payments
       WHERE chit_id=:chitId
         AND chit_month_id=:monthId
         AND status IN ('VERIFIED','PAID','SETTLED','COMPLETED')`,
      { replacements: { chitId, monthId }, transaction },
    );
    const verifiedAmount = Number(verifiedRows[0]?.amount || 0);
    const expectedFromSchedule = Number(month.scheduled_amount || 0) * activeMembers;
    const expectedAmount = Number(summary.expected_amount || 0) || expectedFromSchedule;

    if (activeMembers === 0) {
      throw new ConflictException('Cannot run the draw/auction because the chit has no active members');
    }

    if (obligations !== activeMembers || unresolved > 0 || submitted > 0) {
      const parts: string[] = [];
      if (obligations !== activeMembers) {
        parts.push(`${activeMembers - obligations} member obligation(s) are missing`);
      }
      if (unresolved > 0) {
        parts.push(`${unresolved} unresolved contribution obligation(s)`);
      }
      if (submitted > 0) {
        parts.push(`${submitted} submitted payment(s) awaiting verification`);
      }
      throw new ConflictException(
        `All ${activeMembers} member contributions must be fully verified before the ${'draw/auction'} can run. ${parts.join('; ')}.`,
      );
    }

    if (expectedAmount > 0 && Math.abs(verifiedAmount - expectedAmount) > 0.01) {
      throw new ConflictException(
        `Verified collections are ₹${verifiedAmount.toFixed(2)} but the expected monthly collection is ₹${expectedAmount.toFixed(2)}. Verify every member contribution before running the draw/auction.`,
      );
    }

    return {
      activeMembers,
      obligations,
      unresolved,
      submitted,
      expectedAmount,
      verifiedAmount,
    };
  }
}
