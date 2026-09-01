# V56 Enterprise Hardening — implementation status

Baseline: current `main` branch at time of implementation.

## Implemented in this package

| # | Area | Status | Change |
|---:|---|:---:|---|
| 1 | Canonical Agent capability vocabulary | 🟢 | Existing role helper retained; package builds on capability model |
| 2 | Explicit payout-view permission | 🟢 | Existing V55 capability remains supported |
| 3 | Explicit payout-settlement permission | 🟢 | Existing V55 capability remains supported |
| 4 | Explicit member-invite permission | 🟢 | Existing V55 capability remains supported |
| 5 | Auction reopen permission | 🟢 | Existing V55 capability remains supported |
| 6 | Additional auction permission | 🟢 | Existing V55 capability remains supported |
| 7 | Capability migration | 🟢 | Existing V55 migration retained; no destructive change |
| 8 | Legacy assignment compatibility | 🟢 | Existing compatibility retained |
| 9 | Invitation authorization | 🟢 | Existing V55 implementation retained |
| 10 | Server-authoritative current month | 🟢 | Existing Operations contract retained |
| 11 | currentMonthId | 🟢 | Existing Operations contract retained |
| 12 | currentMonthNumber | 🟢 | Existing Operations contract retained |
| 13 | Configuration lock state | 🟢 | Existing Operations contract retained |
| 14 | Server-authoritative capabilities | 🟢 | Existing Operations contract retained |
| 15 | Agent collections | 🟢 | Existing V55 mobile implementation retained |
| 16 | Agent payout view | 🟢 | Existing V55 mobile implementation retained |
| 17 | Payout view vs settle separation | 🟢 | Existing V55 mobile implementation retained |
| 18 | Notification inbox | 🟢 | Existing implementation retained |
| 19 | Notification mark-read | 🟢 | Existing implementation retained |
| 20 | Operations mobile API | 🟢 | Existing implementation retained |
| 21 | Capability-based Agent UI | 🟢 | Existing roles helper retained |
| 22 | Admin/Creator override | 🟢 | Existing roles helper retained |
| 23 | Payment idempotency contract | 🟢 | Existing adapter retained |
| 24 | Auction lifecycle integration | 🟢 | Mobile now exposes open/close/reopen/finalize |
| 25 | Additional auction integration | 🟢 | Mobile now exposes additional auction when savings permit |
| 26 | Fixed Draw lifecycle | 🟢 | Secure random winner selection + schedule policy |
| 27 | Agent Chit financial flow | 🟢 | Existing service retained without removing invariants |
| 28 | Agent/chit identity | 🟢 | Existing model retained |
| 29 | Agent-assignment FK | 🟢 | Existing migration retained |
| 30 | Reconciliation API | 🟢 | Existing implementation retained |
| 31 | Month-close API | 🟢 | Existing implementation retained |
| 32 | Enterprise hardening | 🟢 | OTP challenge, refresh rotation, schedule policy, secure draw randomness |

## New hardening

### Schedule test mode

`ALLOW_SCHEDULED_OPERATION_BYPASS=false` is the production default.

When true, only Auction/Fixed Draw scheduled date/time gates are bypassed. Authentication, authorization, capability checks, participant eligibility, financial checks, duplicate prevention and locked-month protection remain active.

### Authentication

- Server-side OTP challenge persistence
- OTP expiry
- Maximum attempts
- Request rate limiting
- OTP hash with server pepper
- Production provider gate
- Optional Twilio delivery
- One-time OTP consumption
- Short-lived access tokens
- Hashed refresh tokens
- Refresh-token rotation
- Refresh-token revocation
- Device metadata capture

### Fixed Draw

Winner selection uses `crypto.randomInt`, not `Math.random`.

### Mobile

- Access/refresh token persistence
- Automatic access-token refresh after HTTP 401
- Refresh-token rotation storage
- Logout revocation
- Auction reopen UI
- Additional auction UI

## Runtime verification still required

Source-level implementation is not the same as production certification. Run against a clean database and staging deployment:

- API dependency install/build
- migration execution
- unit tests
- integration/E2E tests
- Android/iOS build
- OTP provider delivery
- refresh-token rotation/reuse tests
- concurrent draw/auction/payout tests
- authorization/IDOR tests
- two-device notification/chat tests
- payment provider/UPI tests
- backup/restore and rollback tests

Do not set `ALLOW_SCHEDULED_OPERATION_BYPASS=true` in production.
