# Recovery/default flow contract

Current backend has scheduler-driven status transitions:

DUE/PARTIAL/PENDING
→ OVERDUE after scheduled date
→ DEFAULTED after collection grace period

Recovery must preserve:
- original obligation
- outstanding amount
- payment audit trail
- participant identity
- creator authorization
- ledger trace

The current codebase does not expose a dedicated "recovery plan" controller. Therefore v35 tests do not invent one. A future recovery API should be added deliberately with:
- creator/member authorization
- recovery plan dates
- installment amount
- remaining balance
- approval/audit
- idempotent payment handling
