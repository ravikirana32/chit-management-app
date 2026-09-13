# Commit 12 — Final Integration / Regression Hardening

## Changed file
- `mobile-app/app/chit-detail.tsx`

## Fix
Historical running-chit months are finalized directly as `LOCKED` by the onboarding flow. The existing chit detail screen only offered the Reconciliation action for `COMPLETED` months.

This commit:
- Detects `data_origin='HISTORICAL'`.
- Labels historical months explicitly as historical/locked.
- Exposes Reconciliation for authorized historical months.
- Keeps Close & Lock unavailable for historical months because they are already locked.
- Does not change any live-month draw, auction, collection, payout, or payment navigation.
- Preserves existing Ledger access.

## Apply
1. Extract at repository root.
2. Replace only the listed file.
3. Run the mobile TypeScript/build checks.
4. Verify:
   - historical locked month shows Reconciliation;
   - tapping Reconciliation opens the correct month;
   - historical month does not show Close & Lock;
   - current LIVE month still shows normal Draw/Auction/Payment actions;
   - Ledger remains available.
5. Commit locally as Commit 12.

## No GitHub changes
This package is for the user's local replacement and commit workflow only.
