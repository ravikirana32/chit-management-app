# v14 Complete — Automated Test & Hardening Foundation

Cumulative ZIP contains v1-v13 plus v14.

Added:
- Jest test scripts
- Unit test suite for payments
- Fixed draw rule tests
- Auction rule tests
- Collection lifecycle tests
- Financial rule tests
- Authorization contract tests
- Concurrency contract tests
- Comprehensive hardening test matrix

Important:
These tests establish the financial invariants and API contracts. Full database integration tests should run against an isolated PostgreSQL test database/containers in CI; no production database is touched by this package.

Next:
- Full PostgreSQL integration test harness
- Test fixtures/factories
- Production auth/OTP provider abstraction
- Mobile app
