# V57 schedule-policy integration

Baseline: current `main` at package creation time.

Implemented:
- Server-only `ALLOW_SCHEDULED_OPERATION_BYPASS`.
- Production default is `false`.
- Test/staging `true` bypasses schedule date/time only.
- Authorization, financial validation, duplicate protection and locked-month rules remain enforced.
- Mobile fetches server policy and does not carry its own bypass environment flag.
- Auction UI disables opening before scheduled date in production.
- Fixed Draw UI disables opening/running before scheduled time/date in production.
- Mobile shows an explicit TEST MODE warning when the server reports bypass enabled.
- Operations endpoint exposes the authoritative policy.
- Auction state exposes schedule policy and allowed action information.
- Fixed Draw schedule bypass covers draw execution and interest window in test mode.
- Existing cryptographic Fixed Draw selection (`crypto.randomInt`) is preserved.

Runtime verification still required against PostgreSQL/Render/Expo.
