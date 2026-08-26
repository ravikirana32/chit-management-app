# v41 — FINAL RELEASE CANDIDATE

Cumulative package: v1 → v41.

This is the final planned cumulative version.

Added:
- Final release audit tests
- Final financial invariants
- Swagger audit
- k6 smoke performance script
- Mobile store-release readiness checklist
- Final release runbook
- Product-rule acceptance checklist
- Final release test command

## Important execution status

This package contains the complete cumulative source and release tooling.

A live production/staging PASS is NOT claimed because this environment does not provide the project's external PostgreSQL/API/FCM/APNs infrastructure and signing credentials.

Run against the real isolated environment:

1. `cd chit_v5`
2. `npm ci`
3. configure `TEST_DATABASE_URL`
4. run migrations
5. seed test data
6. configure `TEST_API_URL`
7. configure `TEST_ACCESS_TOKEN`
8. `npm run build`
9. `npm run test:release`
10. run `k6 run performance/k6-smoke.js`
11. build Android/iOS release artifacts
12. complete RELEASE_CANDIDATE_V41.md

## Product rules confirmed

- Two chit types: Fixed Draw and Auction
- Agent month is a month designation, not a third chit type
- Agent month is configured before publish
- No draw/bid on agent month
- All members pay normal scheduled amount on agent month
- Variable monthly amounts can be configured before publish
- User can be Creator, Member, or Both
- Financial mutations require authorization and idempotency
