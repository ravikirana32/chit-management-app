# Commit 11 — Historical Ledger & Reconciliation Integration

## Changed file
- `chit_v5/src/modules/running-chit-onboarding/running-chit-onboarding.module.ts`

## What this fixes
- Historical running-chit contribution payments were materialized as VERIFIED payments, but were not written to `ledger_entries`.
- The reconciliation service already derives historical collections from the materialized payments and historical opening/closing values; the missing contribution ledger entries caused historical ledger/reconciliation balance checks to disagree.
- Each historical contribution now creates one `CONTRIBUTION` ledger entry referencing the exact payment with `reference_type='PAYMENT'` and `reference_id=<payment id>`.
- This matches the existing ledger service fallback behavior, so the same payment cannot be counted twice.
- Historical payout ledger behavior from Commit 9 is preserved.

## Result
For each finalized historical month:
- expected collection = monthly contribution × active members
- verified collection = materialized historical payments
- ledger net = contribution ledger entries − payout ledger entry
- closing savings = opening savings + verified collections − payout
- reconciliation can now report the historical month as balanced when the derived values agree.

## Apply
1. Extract this ZIP at the repository root.
2. Replace only the file listed above.
3. Do not modify any other files for Commit 11.
4. Run the backend build/tests and exercise one running-chit historical month before committing.
5. Commit locally with a message such as `Commit 11: integrate historical ledger reconciliation`.

## No GitHub changes
This package only prepares the exact file for your local commit. It does not modify the GitHub branch.
