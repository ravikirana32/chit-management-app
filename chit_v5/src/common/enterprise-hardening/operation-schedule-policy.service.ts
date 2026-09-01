import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuctionService } from '../../modules/auctions/auction.service';
import { FixedDrawService } from '../../modules/draws/fixed-draw.service';

@Injectable()
export class OperationSchedulePolicyService implements OnModuleInit {
  readonly bypass: boolean;

  constructor(private readonly config: ConfigService) {
    this.bypass =
      this.config.get<string>('ALLOW_SCHEDULED_OPERATION_BYPASS', 'false')
        .trim().toLowerCase() === 'true';
  }

  isBypassEnabled(): boolean {
    return this.bypass;
  }

  /**
   * Returns the single server-authoritative schedule policy consumed by the
   * mobile application. The mobile must never carry its own environment flag.
   */
  policy() {
    return {
      scheduleBypassEnabled: this.bypass,
      mode: this.bypass ? 'TEST' : 'PRODUCTION',
      auction: {
        dateTimeEnforced: !this.bypass,
        description: this.bypass
          ? 'Scheduled date/time restrictions are bypassed for authorized test operations.'
          : 'Auction operations are available only at their configured scheduled time/date.',
      },
      fixedDraw: {
        dateTimeEnforced: !this.bypass,
        description: this.bypass
          ? 'Scheduled date/time restrictions are bypassed for authorized test operations.'
          : 'Fixed draw operations are available only at their configured scheduled time/date.',
      },
      security: {
        authorizationStillRequired: true,
        financialValidationStillRequired: true,
        lockedMonthStillProtected: true,
      },
    };
  }

  /**
   * Production helper for controllers/services that need an explicit guard.
   * Never use the bypass as an authorization decision.
   */
  assertScheduleAllowed(allowed: boolean, message: string): void {
    if (!this.bypass && !allowed) throw new ConflictException(message);
  }

  onModuleInit() {
    /*
     * Compatibility hooks: existing Auction/Draw services own financial
     * transactions and authorization. This service changes ONLY schedule
     * gates when explicitly enabled.
     *
     * The previous implementation only bypassed Auction's local-date check
     * and Fixed Draw's run timestamp. V57 also covers Fixed Draw interest
     * windows and Auction date checks on close/reopen.
     */
    if (!this.bypass) return;

    const auctionProto: any = AuctionService.prototype as any;
    const originalLocalDateMatches = auctionProto.localDateMatches;
    if (!auctionProto.__v57ScheduleBypassPatched && originalLocalDateMatches) {
      auctionProto.localDateMatches = async function (..._args: any[]) {
        return true;
      };
      auctionProto.__v57ScheduleBypassPatched = true;
    }

    const drawProto: any = FixedDrawService.prototype as any;

    if (!drawProto.__v57RunDrawScheduleBypassPatched && drawProto.runDraw) {
      const originalRunDraw = drawProto.runDraw;
      drawProto.runDraw = async function (
        this: FixedDrawService,
        chitId: string,
        monthId: string,
        actorUserId: string,
      ) {
        const db: any = (this as any).sequelize;
        const [rows]: any = await db.query(
          `SELECT scheduled_at FROM draws WHERE chit_month_id=:monthId`,
          { replacements: { monthId } },
        );
        const original = rows[0]?.scheduled_at ?? null;

        if (rows.length) {
          await db.query(
            `UPDATE draws SET scheduled_at=NOW(),updated_at=NOW() WHERE chit_month_id=:monthId`,
            { replacements: { monthId } },
          );
        }

        try {
          const result = await originalRunDraw.call(this, chitId, monthId, actorUserId);
          return result;
        } finally {
          if (rows.length) {
            await db.query(
              `UPDATE draws SET scheduled_at=:original,updated_at=NOW()
               WHERE chit_month_id=:monthId AND status <> 'COMPLETED'`,
              { replacements: { monthId, original } },
            );
          }
        }
      };
      drawProto.__v57RunDrawScheduleBypassPatched = true;
    }

    if (!drawProto.__v57InterestScheduleBypassPatched && drawProto.setInterest) {
      const originalSetInterest = drawProto.setInterest;
      drawProto.setInterest = async function (
        this: FixedDrawService,
        chitId: string,
        monthId: string,
        actorUserId: string,
        interested: boolean,
      ) {
        const db: any = (this as any).sequelize;
        const [rows]: any = await db.query(
          `SELECT draw_interest_opens_at,draw_interest_closes_at
             FROM chit_months WHERE id=:monthId AND chit_id=:chitId`,
          { replacements: { monthId, chitId } },
        );
        const original = rows[0] ?? null;

        if (rows.length) {
          await db.query(
            `UPDATE chit_months
             SET draw_interest_opens_at=NOW()-INTERVAL '1 minute',
                 draw_interest_closes_at=NOW()+INTERVAL '1 minute',
                 updated_at=NOW()
             WHERE id=:monthId AND chit_id=:chitId`,
            { replacements: { monthId, chitId } },
          );
        }

        try {
          return await originalSetInterest.call(
            this, chitId, monthId, actorUserId, interested,
          );
        } finally {
          if (rows.length) {
            await db.query(
              `UPDATE chit_months
               SET draw_interest_opens_at=:opens,
                   draw_interest_closes_at=:closes,
                   updated_at=NOW()
               WHERE id=:monthId AND chit_id=:chitId`,
              {
                replacements: {
                  monthId,
                  chitId,
                  opens: original?.draw_interest_opens_at ?? null,
                  closes: original?.draw_interest_closes_at ?? null,
                },
              },
            );
          }
        }
      };
      drawProto.__v57InterestScheduleBypassPatched = true;
    }
  }
}
