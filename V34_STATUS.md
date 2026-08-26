# v34 Complete — Payment, Draw, Auction & Payout E2E

Cumulative package: v1 → v34.

Concrete service fixes discovered during inspection:
- Auction bid response now uses `submitted_at` instead of nonexistent `bid_at`
- Auction finalization reads `bids.amount` instead of nonexistent `bid_amount`
- Fixed draw accepts the published `READY_TO_START` chit state
- Payout recipient query uses `users.mobile_number`
- Payout settlement checks for an existing payout ledger entry

Added:
- Payment lifecycle integration test
- Fixed draw → payout lifecycle test
- Auction → winner → payout lifecycle test
- Same-idempotency-key concurrent payment test
- Expanded RC test command

No external staging run is claimed. The tests require a real isolated API + PostgreSQL environment and suitable test IDs/tokens.

Next:
- Execute/fix lifecycle tests against staging
- Add full member seed + obligation generation API
- Verify settled payout ledger entries
- Add auction winner eligibility and discount accounting assertions
- Add recovery/default flows
- Release candidate
