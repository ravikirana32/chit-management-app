# v36 Complete — Release Candidate Hardening

Cumulative package: v1 → v36.

Added:
- End-of-chit reconciliation endpoint
- Final financial completion calculation
- Final month-lock verification
- Outstanding/default/recovery exception verification
- Pending payout verification
- Winner-count verification
- Member statement mobile-column correction
- Security regression tests for unauthenticated financial actions
- Expanded RC test command

Final reconciliation is considered complete only when:
- Every chit month is LOCKED
- Outstanding contribution balance is zero
- No OVERDUE/DEFAULTED/RECOVERY_PLAN obligations remain
- No PENDING payouts remain
- All expected winners are recorded

Important:
No external staging execution is claimed.

Next v37:
- Security and authorization audit
- IDOR/ownership regression
- Rate limiting
- JWT/session hardening
- Sensitive financial-data protection
- Audit-log security
