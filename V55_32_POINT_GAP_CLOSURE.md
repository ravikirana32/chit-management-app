# V55 — 32-point API/UI gap-closure package

Target baseline: `main` commit `c38f1b96b64dbad1dfc46cc204de4b396da3b9f5`.

## Included implementation changes

1. Canonical capability vocabulary for mobile.
2. Explicit payout view capability.
3. Explicit payout settlement capability.
4. Explicit member-invite capability.
5. Explicit auction reopen capability.
6. Explicit additional-auction capability.
7. Migration/backfill for new capabilities.
8. Compatibility trigger for legacy agent-assignment inserts.
9. Participant invitation now requires `can_invite_members`.
10. Operations summary now exposes authoritative current month.
11. Operations summary exposes `currentMonthId`.
12. Operations summary exposes `currentMonthNumber`.
13. Operations summary exposes configuration lock state.
14. Operations summary exposes server-authoritative capabilities.
15. Mobile collections accepts assigned collection agents.
16. Mobile payouts accepts authorized agents.
17. Mobile payouts separates view vs settle capability.
18. Mobile notification screen reads the backend notification feed.
19. Mobile notification screen supports mark-read.
20. Mobile API surface exposes authoritative operations summary.
21. Mobile role helpers stop coupling all Agent operations to one boolean.
22. Mobile keeps Admin/Creator override behavior.
23. Existing payment idempotency adapter retained.
24. Existing auction reopen API adapter retained.
25. Existing additional-auction API adapter retained.
26. Existing draw funded-later API retained.
27. Existing payout funded-later financial calculation retained.
28. Existing agent/chit identity model retained.
29. Existing migration 051 FK repair retained.
30. Existing reconciliation APIs retained.
31. Existing month-close APIs retained.
32. A single replacement package is produced so API/UI files can be reviewed together.

## Important verification status

This package is **source-level gap closure**, not a claim that all 32 are runtime-green.

Before production, run:

- API dependency install
- API TypeScript build
- API unit tests
- API integration/E2E suite against a clean migrated PostgreSQL database
- Mobile TypeScript check/build
- Mobile unit tests
- Android/iOS smoke flow
- authorization/IDOR tests
- payment/payout concurrency tests
- two-device chat/notification tests
- staging deployment and rollback test

The repository connector available in this session is read-only for writes, so these files are delivered as directly replaceable artifacts rather than pushed to `main`.
