import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Single server-side schedule policy.
 *
 * The mobile app never owns this flag. It consumes the resulting policy/action
 * state from the API. The bypass affects scheduling only; it never bypasses
 * authorization, business state, financial validation or lock rules.
 */
@Injectable()
export class OperationSchedulePolicyService {
  readonly bypass: boolean;

  constructor(private readonly config: ConfigService) {
    this.bypass =
      this.config.get<string>('ALLOW_SCHEDULED_OPERATION_BYPASS', 'false')
        .trim()
        .toLowerCase() === 'true';
  }

  isBypassEnabled(): boolean {
    return this.bypass;
  }

  assertScheduleAllowed(allowed: boolean, message: string): void {
    if (!this.bypass && !allowed) {
      throw new ConflictException(message);
    }
  }

  policy() {
    return {
      scheduleBypassEnabled: this.bypass,
      mode: this.bypass ? 'TEST' : 'PRODUCTION',
      auction: {
        dateTimeEnforced: !this.bypass,
      },
      fixedDraw: {
        dateTimeEnforced: !this.bypass,
      },
      security: {
        authorizationStillRequired: true,
        financialValidationStillRequired: true,
        lockedMonthStillProtected: true,
      },
    };
  }
}
