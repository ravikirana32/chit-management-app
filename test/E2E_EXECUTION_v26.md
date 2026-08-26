# v26 E2E Execution

Use the fixture IDs in `test/fixtures`.

## Required environment variables

API_URL
SOCKET_URL
TEST_CREATOR_MOBILE
TEST_MEMBER_MOBILE
TEST_OTP

Do not commit real credentials.

## Core scenarios

1. Creator authenticates.
2. Creator creates `test-fixed-001`.
3. Members join.
4. Chit publishes.
5. Member submits partial payment.
6. Creator verifies partial payment.
7. Member completes payment.
8. Fixed draw excludes previous winner.
9. Agent month skips draw/bid.
10. Auction opens.
11. Valid bid accepted.
12. Invalid bid rejected.
13. Auction closes.
14. Winner payout created.
15. Payout settled.
16. Ledger reconciles.
17. Overdue is created after grace period.
18. Recovery plan is created.
19. Recovery payment is processed.
20. Month locks after reconciliation.

## Race tests

Run at least 10 concurrent attempts for:
- same payment verification
- same auction finalization
- same fixed draw execution
- same payout settlement

Expected: exactly one successful financial transition.
