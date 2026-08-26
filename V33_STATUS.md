# v33 Complete — Financial Lifecycle Tests

Cumulative package: v1 → v33.

Added:
- Complete financial lifecycle integration suite
- Agent month draw rejection
- Agent commission lifecycle assertion
- Agent commission duplicate protection
- Payment idempotency DTO/header propagation
- Fixed draw idempotency key
- Real PostgreSQL ledger assertion for agent commission
- Auction pre-open bid rejection
- End-to-end lifecycle test structure

Important:
The suite requires an isolated PostgreSQL + API environment and authenticated test token. No external test run is claimed.

Next:
- Complete real payment obligation fixture/HTTP submission
- Execute fixed draw with seeded eligible members
- Open/finalize real auction and verify winner/payout
- Add payout settlement assertions
- Add concurrent same-key HTTP tests
- Final release candidate
