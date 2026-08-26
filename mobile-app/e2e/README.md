# Mobile E2E — v23

Tests must run against an isolated staging/test backend and database.

Recommended flow:
1. Provision test DB.
2. Seed creator/member accounts.
3. Start API + Socket.IO.
4. Start Expo development build.
5. Run deterministic scenarios.
6. Export test report.
7. Destroy test DB.

Never run financial E2E tests against production.
