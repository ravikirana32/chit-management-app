# V58 replacement package

Baseline: `main` commit `3987f7171b6e881ffcfb27220c1d6372f078a9e9`.

Implemented in this package:
- server-only schedule policy
- production-safe default `false`
- explicit `/v1/operations/policy`
- current-month + capability contract
- no mobile environment flag
- API-controlled test-mode indicator
- mobile contract files to consume the server policy

Important:
The large financial services are intentionally not reconstructed here. Their
complete source must be edited in-place for explicit DI if replacing the
remaining V57 prototype hooks. This package does not pretend that runtime
build/E2E certification has passed.

Expected behavior:
false => scheduled Auction/Fixed Draw date/time is enforced.
true  => authorized test operations may bypass only scheduled timing.
