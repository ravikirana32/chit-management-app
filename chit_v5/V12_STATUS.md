# v12 Complete — Dashboards + Recovery + Hardening foundation

Cumulative ZIP contains v1-v11 plus v12.

Added:
- Member dashboard API
- Creator chit dashboard API
- Financial progress summary
- Winner history
- Payout history
- Auction history
- Recovery/payment plan creation
- Recovery state on contribution obligation
- Recovery-plan migration
- Creator authorization and transaction locking

Dashboard APIs:
GET /api/v1/dashboard/me
GET /api/v1/dashboard/chits/:chitId

Recovery:
POST /api/v1/recovery/chits/:chitId/plans

The recovery plan currently creates the plan and marks the obligation RECOVERY_PLAN. Actual installment settlement should reuse the existing payment verification flow and is the next accounting hardening item.

Next:
- Configurable per-chit grace period
- Recovery installment obligations
- Auction discount distribution configuration
- Integration/concurrency tests
- API validation/error consistency
- Production auth/OTP provider
- Mobile app
