import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { AuctionService } from './auction.service';
import { AuctionGateway } from './auction.gateway';
import { WinnerRevealService } from '../../common/enterprise-hardening/winner-reveal.service';
import { OperationSchedulePolicyService } from '../../common/enterprise-hardening/operation-schedule-policy.service';
import { VerifiedContributionGateService } from '../../common/verified-contribution-gate.service';

/**
 * Preserves the existing auction implementation and blocks finalization until
 * every active member contribution for the monthly auction is verified.
 */
@Injectable()
export class VerifiedAuctionService extends AuctionService {
  constructor(
    private readonly db: Sequelize,
    gateway: AuctionGateway,
    winnerReveal: WinnerRevealService,
    schedulePolicy: OperationSchedulePolicyService,
    private readonly contributionGate: VerifiedContributionGateService,
  ) {
    super(db, gateway, winnerReveal, schedulePolicy);
  }

  async finalize(auctionId: string, actorUserId: string) {
    const [rows]: any = await this.db.query(
      `SELECT chit_id,chit_month_id
       FROM auctions
       WHERE id=:auctionId
       LIMIT 1`,
      { replacements: { auctionId } },
    );
    if (!rows.length) {
      return super.finalize(auctionId, actorUserId);
    }
    if (rows[0].chit_month_id) {
      await this.contributionGate.assertFullyVerified(rows[0].chit_id, rows[0].chit_month_id);
    }
    return super.finalize(auctionId, actorUserId);
  }
}
