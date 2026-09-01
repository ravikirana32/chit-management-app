import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuctionService } from '../../modules/auctions/auction.service';
import { FixedDrawService } from '../../modules/draws/fixed-draw.service';

/**
 * Central schedule policy.
 *
 * The compatibility hooks intentionally live here rather than changing the
 * financial algorithms. With the flag off, existing production date/time
 * rules remain untouched. With it on, only scheduled-time gates are bypassed.
 */
@Injectable()
export class OperationSchedulePolicyService implements OnModuleInit {
  readonly bypass: boolean;

  constructor(private readonly config: ConfigService) {
    this.bypass = this.config.get<string>('ALLOW_SCHEDULED_OPERATION_BYPASS', 'false').toLowerCase() === 'true';
  }

  onModuleInit() {
    if (!this.bypass) return;

    const auctionProto: any = AuctionService.prototype as any;
    const originalLocalDateMatches = auctionProto.localDateMatches;
    if (!auctionProto.__v56ScheduleBypassPatched && originalLocalDateMatches) {
      auctionProto.localDateMatches = async function (..._args: any[]) {
        return true;
      };
      auctionProto.__v56ScheduleBypassPatched = true;
    }

    const drawProto: any = FixedDrawService.prototype as any;
    const originalRunDraw = drawProto.runDraw;
    if (!drawProto.__v56ScheduleBypassPatched && originalRunDraw) {
      drawProto.runDraw = async function (this: FixedDrawService, chitId: string, monthId: string, actorUserId: string) {
        // The existing service owns all authorization, eligibility, locking and
        // payout logic. We only move its scheduled timestamp to NOW for the
        // duration of this test invocation, then restore the original value.
        const db: any = (this as any).sequelize;
        const [rows]: any = await db.query(
          `SELECT scheduled_at FROM draws WHERE chit_month_id=:monthId FOR UPDATE`,
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
          if (rows.length) {
            await db.query(
              `UPDATE draws SET scheduled_at=:original,updated_at=NOW() WHERE chit_month_id=:monthId AND status='COMPLETED'`,
              { replacements: { monthId, original } },
            );
          }
          return result;
        } catch (error) {
          if (rows.length) {
            await db.query(
              `UPDATE draws SET scheduled_at=:original,updated_at=NOW() WHERE chit_month_id=:monthId`,
              { replacements: { monthId, original } },
            );
          }
          throw error;
        }
      };
      drawProto.__v56ScheduleBypassPatched = true;
    }
  }
}
