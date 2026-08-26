# v43 Complete — Existing Chit Migration Foundation

Cumulative package: v1 → v43.

Added:
- Historical chit import batch model
- Historical source metadata
- Member import template
- Month/winner import template
- Individual payment import template
- UPI/CASH/BANK_TRANSFER/OTHER historical payment methods
- Import validation
- Duplicate month detection
- Unknown member payment detection
- Draft import batch
- Review state
- Mobile import-existing-chit foundation
- Swagger/API contracts
- Integration tests

Import lifecycle:
VALIDATE → DRAFT → REVIEW → APPLY

The APPLY step is intentionally deferred to v44 reconciliation so incomplete historical financial data cannot silently become active balances.

Next v44:
- Apply historical members/months/winners/payments
- Historical obligation creation
- Expected vs actual reconciliation
- Difference/adjustment workflow
- Creator confirmation
- Activate migrated chit at current month
- Prevent double import
