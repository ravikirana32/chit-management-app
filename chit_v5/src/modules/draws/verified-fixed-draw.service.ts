import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { FixedDrawFundedLaterService } from './fixed-draw-funded-later.service';
import { VerifiedContributionGateService } from '../../common/verified-contribution-gate.service';

/**
 * Keeps the existing funded-later draw implementation but adds the mandatory
 * contribution-verification gate immediately before winner selection.
 */
@Injectable()
export class VerifiedFixedDrawService extends FixedDrawFundedLaterService {
  constructor(
    db: Sequelize,
    private readonly contributionGate: VerifiedContributionGateService,
  ) {
    super(db);
  }

  async runDraw(chitId: string, monthId: string, actorUserId: string) {
    await this.contributionGate.assertFullyVerified(chitId, monthId);
    return super.runDraw(chitId, monthId, actorUserId);
  }
}
