# v30 Complete — HTTP Integration & Financial Invariants

Cumulative package: v1 → v30.

Added:
- HTTP API smoke tests
- Financial database invariants
- Ledger reconciliation tests
- Month-lock test
- Integration test scripts
- Idempotency migration for payments, payouts, draws and auction finalization
- HTTP financial contract guide

Important:
Tests are now executable against a real staging/test API and PostgreSQL database, but this environment does not contain running external services, so no external pass result is claimed.

Next:
- Execute the integration suite
- Add authenticated HTTP test mode
- Add actual payment/draw/auction/payout HTTP assertions
- Add concurrent request tests
- Fix any real runtime defects
- Release candidate
