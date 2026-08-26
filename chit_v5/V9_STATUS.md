# v9 Complete — Ledger + Payout Settlement

Cumulative ZIP contains v1-v8 plus v9.

Added:
- Participant ledger API
- Creator complete chit ledger API
- Creator manual adjustment API
- Running balance calculation
- Payout register
- Creator payout settlement/rejection
- Payout-to-ledger transaction
- Duplicate payout ledger reference protection
- Ledger migration and indexes

Accounting convention:
- Positive ledger amount = credit/benefit to participant
- Negative ledger amount = debit/payment obligation or settled payout, depending on entry type

Next:
- Monthly reconciliation
- Member statements
- Agent commission accounting
- Discount distribution accounting
- Financial dashboard/report APIs
- Notifications tied to payments/payouts
