# API Contract Audit — v23

## Verified mobile adapters
- Auth OTP request/verify
- User profile
- Chit create
- Chit dashboard
- Chit publish
- Chit rules
- Participants
- Payments
- Payment verification
- Auctions
- Draws
- Agent commission
- Ledger
- Payouts
- Collections
- Notifications

## Contract-sensitive items requiring staging verification
1. Exact authenticated-user participant ID field.
2. Exact auction Socket.IO event names/payloads.
3. Payment verification authorization.
4. Payout settlement authorization.
5. Agent-month commission payload.
6. Creator dashboard aggregation field names.
7. Member monthly schedule field names.
8. OTP provider behavior.
9. Refresh-token endpoint, if enabled.
10. API version prefix and deployment base URL.

The mobile API adapters intentionally isolate these points so endpoint/payload changes do not require rewriting screens.
