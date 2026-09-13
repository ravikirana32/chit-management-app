# Commit 03 — Collections UI/API Repair

Base branch: `experiment/commit-by-commit`
Repository: `ravikirana32/chit-management-app`

## File to replace

- `mobile-app/app/collections.tsx`

## What this fixes

The Collections screen previously showed only overdue items and did not actually expose the authoritative current-month obligations or the collection/verification actions. It therefore did not provide a usable collection workflow.

This commit changes the screen to:

- Load the chit and identify the first open/current month.
- Load authoritative contribution obligations through the existing payments API.
- Load submitted payments for the current month.
- Load participant information for readable member names.
- Allow authorized creator/admin/collection-agent users to record CASH directly against an obligation.
- Require a cash receipt/reference when recording cash.
- Allow authorized verification users to verify submitted member payments.
- Show due, paid and outstanding amounts per obligation.
- Continue showing overdue/defaulted exceptions.
- Keep completed/locked months out of the mutation UI.

## Backend contract used

The existing API already provides:
- `paymentsApi.obligations(chitId, monthId)`
- `paymentsApi.list(chitId, monthId)`
- `paymentsApi.recordCash(obligationId, payload)`
- `paymentsApi.verify(paymentId, payload)`
- `collectionsApi.overdue(chitId)`

Commit 02 additionally protects the payment-collection endpoint against mutation of completed/locked months.

## Regression protection

- No changes to payment database schema.
- No changes to existing payment workflow service.
- No changes to draw, auction, payout or reconciliation logic.
- Existing member payment screen remains unchanged.
- Historical months remain viewable but are not offered as active collection targets.

## Apply

Replace only the file listed above.

**DO NOT COMMIT ANY ADDITIONAL CHANGES YET** beyond this commit in the staged working tree.

Expected result: opening **Collections** for an active chit displays the current month's obligations and lets an authorized operator record cash and verify submitted payments.

Next: **Commit 04 — Ledger repair.**
