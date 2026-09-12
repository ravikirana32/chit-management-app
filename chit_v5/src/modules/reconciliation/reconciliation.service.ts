import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

const N = (v: any) => Number(v || 0);
const R = (v: any) => Number(N(v).toFixed(2));

@Injectable()
export class ReconciliationService {
  constructor(private readonly sequelize: Sequelize) {}

  private async assertAccess(chitId: string, userId: string) {
    const [rows]: any = await this.sequelize.query(
      `SELECT 1
       FROM chits c
       LEFT JOIN chit_agent_assignments ca ON ca.chit_id=c.id AND ca.active=true
       LEFT JOIN agents ag ON ag.id=ca.agent_id AND ag.status='ACTIVE' AND ag.user_id=:userId
       WHERE c.id=:chitId
         AND (
           c.creator_id=:userId
           OR (ag.id IS NOT NULL AND (COALESCE(ca.can_manage_chit,false)=true OR COALESCE(ca.can_collect_cash,false)=true))
           OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=:userId AND ur.role='ADMIN')
         )
       LIMIT 1`,
      { replacements: { chitId, userId } },
    );
    if (!rows.length) throw new ConflictException('Reconciliation permission is required for this chit');
  }

  async chitSummary(chitId: string, userId: string) {
    await this.assertAccess(chitId, userId);
    const [summary]: any = await this.sequelize.query(
      `SELECT
        COALESCE((SELECT SUM(amount) FROM payments WHERE chit_id=:chitId AND status='VERIFIED'),0) AS collected,
        COALESCE((SELECT SUM(amount) FROM payouts WHERE chit_id=:chitId AND status='SETTLED'),0) AS paid_out,
        COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE chit_id=:chitId AND entry_type='AGENT_COMMISSION'),0) AS agent_commission,
        COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE chit_id=:chitId AND entry_type='AUCTION_DISCOUNT'),0) AS auction_discount,
        COALESCE((SELECT SUM(due_amount) FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:chitId),0) AS expected_collections,
        COALESCE((SELECT SUM(outstanding_amount) FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:chitId),0) AS outstanding`,
      { replacements: { chitId } },
    );
    return { success: true, chitId, financial: summary[0] };
  }

  async monthly(chitId: string, monthId: string, userId: string) {
    await this.assertAccess(chitId, userId);

    const [rows]: any = await this.sequelize.query(
      `SELECT m.*,c.creator_id
       FROM chit_months m JOIN chits c ON c.id=m.chit_id
       WHERE m.id=:monthId AND m.chit_id=:chitId`,
      { replacements: { monthId, chitId } },
    );
    if (!rows.length) throw new NotFoundException('Month not found');

    const [r]: any = await this.sequelize.query(
      `SELECT
        m.id,m.month_number,m.scheduled_amount,m.status,m.data_origin,m.historical_data,
        COALESCE((SELECT SUM(o.due_amount) FROM contribution_obligations o WHERE o.chit_month_id=m.id),0) AS expected_collections,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.chit_month_id=m.id AND p.status='VERIFIED'),0) AS verified_collections,
        COALESCE((SELECT SUM(p.amount) FROM payouts p WHERE p.chit_month_id=m.id AND p.status='SETTLED'),0) AS payout,
        COALESCE((SELECT SUM(le.amount) FROM ledger_entries le WHERE le.chit_month_id=m.id),0) AS ledger_net,
        COALESCE((SELECT SUM(o.outstanding_amount) FROM contribution_obligations o WHERE o.chit_month_id=m.id),0) AS outstanding,
        COALESCE((SELECT COUNT(*) FROM contribution_obligations o WHERE o.chit_month_id=m.id AND o.status IN ('PAID','VERIFIED','SETTLED','COMPLETED') AND o.outstanding_amount<=0),0) AS paid_members,
        COALESCE((SELECT COUNT(*) FROM contribution_obligations o WHERE o.chit_month_id=m.id AND o.status IN ('OVERDUE','DEFAULTED','RECOVERY_PLAN')),0) AS overdue_members
       FROM chit_months m WHERE m.id=:monthId`,
      { replacements: { monthId } },
    );

    const x = r[0];
    const history = x.historical_data || {};
    let openingSavings = history.openingSavings != null ? N(history.openingSavings) : 0;
    if (history.openingSavings == null && N(x.month_number) > 1) {
      const [prev]: any = await this.sequelize.query(
        `SELECT historical_data->>'closingSavings' AS closing_savings
         FROM chit_months WHERE chit_id=:chitId AND month_number=:monthNumber LIMIT 1`,
        { replacements: { chitId, monthNumber: N(x.month_number) - 1 } },
      );
      openingSavings = prev.length ? N(prev[0].closing_savings) : 0;
    }

    const calculatedClosing = R(openingSavings + N(x.verified_collections) - N(x.payout));
    const recordedClosing = history.closingSavings != null ? N(history.closingSavings) : calculatedClosing;
    const closingVariance = R(recordedClosing - calculatedClosing);
    const expectedChange = R(N(x.verified_collections) - N(x.payout));
    const ledgerVariance = R(N(x.ledger_net) - expectedChange);
    const closed = ['LOCKED','COMPLETED','CLOSED'].includes(String(x.status));
    const balanced = closed && Math.abs(closingVariance) <= 0.01 && Math.abs(ledgerVariance) <= 0.01;

    return {
      success: true,
      data: {
        ...x,
        expectedCollections: R(x.expected_collections),
        verifiedCollections: R(x.verified_collections),
        openingSavings: R(openingSavings),
        availableFunds: R(openingSavings + N(x.verified_collections)),
        payout: R(x.payout),
        calculatedClosingSavings: calculatedClosing,
        closingSavings: R(recordedClosing),
        closingVariance,
        ledgerNet: R(x.ledger_net),
        ledgerVariance,
        outstanding: R(x.outstanding),
        balanced,
        checks: {
          collectionsRecorded: Math.abs(N(x.expected_collections) - N(x.verified_collections)) <= 0.01,
          payoutWithinAvailableFunds: N(x.payout) <= N(openingSavings) + N(x.verified_collections) + 0.01,
          savingsContinuity: Math.abs(closingVariance) <= 0.01,
          ledgerBalanced: Math.abs(ledgerVariance) <= 0.01,
          monthClosed: closed,
        },
      },
    };
  }

  async memberStatements(chitId: string, userId: string) {
    await this.assertAccess(chitId, userId);
    const [rows]: any = await this.sequelize.query(
      `SELECT cp.id AS participant_id,cp.participant_sequence,u.name,u.mobile_number AS mobile,
        COALESCE(SUM(CASE WHEN le.amount>0 THEN le.amount ELSE 0 END),0) AS credits,
        COALESCE(SUM(CASE WHEN le.amount<0 THEN ABS(le.amount) ELSE 0 END),0) AS debits,
        COALESCE(SUM(le.amount),0) AS net_balance,
        COALESCE(SUM(o.outstanding_amount),0) AS outstanding
       FROM chit_participants cp JOIN users u ON u.id=cp.user_id
       LEFT JOIN ledger_entries le ON le.chit_participant_id=cp.id
       LEFT JOIN contribution_obligations o ON o.chit_participant_id=cp.id
       WHERE cp.chit_id=:chitId
       GROUP BY cp.id,cp.participant_sequence,u.name,u.mobile_number
       ORDER BY cp.participant_sequence`,
      { replacements: { chitId } },
    );
    return rows;
  }

  async final(chitId: string, userId: string) {
    await this.assertAccess(chitId, userId);
    const [chit]: any = await this.sequelize.query(`SELECT c.* FROM chits c WHERE c.id=:chitId`, { replacements: { chitId } });
    if (!chit.length) throw new NotFoundException('Chit not found');
    const [months]: any = await this.sequelize.query(
      `SELECT COUNT(*)::int total,
              COUNT(*) FILTER(WHERE status='LOCKED')::int locked,
              COUNT(*) FILTER(WHERE status IN ('ACTIVE','OPEN','IN_PROGRESS'))::int open_months
       FROM chit_months WHERE chit_id=:chitId`,
      { replacements: { chitId } },
    );
    const [ob]: any = await this.sequelize.query(
      `SELECT COALESCE(SUM(outstanding_amount),0) outstanding,
              COUNT(*) FILTER(WHERE status IN ('OVERDUE','DEFAULTED','RECOVERY_PLAN'))::int exceptions
       FROM contribution_obligations o JOIN chit_months m ON m.id=o.chit_month_id WHERE m.chit_id=:chitId`,
      { replacements: { chitId } },
    );
    const [payout]: any = await this.sequelize.query(
      `SELECT COALESCE(SUM(amount),0) settled,COUNT(*) FILTER(WHERE status='PENDING')::int pending
       FROM payouts WHERE chit_id=:chitId`,
      { replacements: { chitId } },
    );
    const [winners]: any = await this.sequelize.query(
      `SELECT
        (SELECT COUNT(*) FROM draw_winners dw JOIN draws d ON d.id=dw.draw_id WHERE d.chit_id=:chitId) +
        (SELECT COUNT(*) FROM auction_winners aw JOIN auctions a ON a.id=aw.auction_id WHERE a.chit_id=:chitId) AS winners`,
      { replacements: { chitId } },
    );
    const complete = Number(months[0].total)>0 && Number(months[0].locked)===Number(months[0].total)
      && N(ob[0].outstanding)===0 && Number(ob[0].exceptions)===0 && Number(payout[0].pending)===0;
    return { success:true, data:{chit:chit[0],months:months[0],obligations:ob[0],payouts:payout[0],winners:winners[0],complete} };
  }
}
