# v32 Complete — Real HTTP + DB Assertions

Cumulative package: v1 → v32.

Added:
- Real HTTP request payload helpers based on actual CreateChitDto
- Real Fixed Chit creation test with variable monthly amounts
- Agent-month persistence assertion
- Real Auction Chit creation test
- Participant endpoint test
- Publish-state test
- Payment profile persistence test
- Agent-month DB invariant suite
- Expanded release-candidate test command

Important:
The tests require a running staging/test API, PostgreSQL database, authenticated test access token, and optionally a test agent ID. No external test environment has been executed or claimed as passed.

Next:
- Complete authenticated member fixtures
- Real payment lifecycle test
- Real fixed draw execution test
- Real auction bid/finalization test
- Real payout/ledger assertion
- Same-key concurrent HTTP tests
- Release candidate
