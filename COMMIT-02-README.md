# Commit 02 — Completed/Locked Month Lifecycle Protection

Base branch: `experiment/commit-by-commit`
Repository: `ravikirana32/chit-management-app`

## File to replace

- `chit_v5/src/modules/payment-collection/payment-collection.module.ts`

## What this fixes

The payment-collection API previously allowed a member to submit a payment or an authorized collector to record cash using an obligation without checking the lifecycle state of its month.

This commit makes completed/locked lifecycle states authoritative at the collection boundary:

- `COMPLETED`
- `LOCKED`
- `CLOSED`
- `CANCELLED`

For those states:
- member payment submission is rejected
- cash collection is rejected

The check happens inside the database transaction after locking the obligation, so the API cannot be bypassed by directly calling the endpoint.

## Existing behavior preserved

- Active/open months continue through the same payment flow.
- Permission checks are unchanged.
- Amount validation is unchanged.
- Payment records and obligation updates are unchanged for valid open months.
- No draw/auction logic is modified because the current draw/auction services already reject non-actionable month states.

## Apply

Replace only the file listed above.

**DO NOT COMMIT ANY ADDITIONAL CHANGES YET.**

Expected result: once a month is completed/locked, its collection endpoints reject new payment activity while historical data remains readable.

Next: **Commit 03 — Collections UI/API repair.**
