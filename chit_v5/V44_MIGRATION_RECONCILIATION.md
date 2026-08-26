# v44 — Migration Reconciliation & Financial Integration

## Migration lifecycle

VALIDATE
→ DRAFT
→ REVIEW
→ RECONCILE
→ RESOLVE DIFFERENCES
→ APPLY
→ ACTIVATE

## Historical financial safety

Historical payments remain identifiable by:
- `historical_source = HISTORICAL_IMPORT`
- `import_batch_id`
- `original_reference`
- `historical_notes`

## Reconciliation

For each historical month:

Expected = scheduled monthly amount
Imported = sum of imported payments
Difference = Expected - Imported

A month is:
- MATCHED when difference = 0
- UNRESOLVED when difference != 0
- RESOLVED after creator records a legitimate resolution

Resolution types:
- WAIVED
- ADJUSTED
- MISSING_HISTORICAL_DATA
- CORRECTED

## Activation

A batch cannot be applied while unresolved differences remain.

After APPLY, the creator explicitly activates the migrated chit.

The current month then continues through normal live:
- UPI
- Cash
- Creator/Agent cash recording
- Draw
- Auction
- Agent month
- Winner collection
- Payout
- Ledger
- Final reconciliation

This version deliberately does not fabricate historical individual payments where source data is missing.
