# v13 Complete — Financial & Business Rule Hardening

Cumulative ZIP contains v1-v12 plus v13.

Added:
- Per-chit collection grace days (0–90)
- Agent commission mode configuration
- Auction discount distribution configuration
- Recovery installment generation
- Monthly financial close/lock
- Close validation for unresolved obligations
- Close validation for pending payouts
- Financial rules migration
- Default processing now uses per-chit grace period

New APIs:
PUT /api/v1/chit-rules/chits/:chitId
PUT /api/v1/auction-rules/chits/:chitId/discount-distribution
POST /api/v1/month-close/months/:monthId

Recovery installments are generated separately from the original obligation so the existing payment verification remains the single source of truth for money movement.

Next:
- Apply auction discount distribution into ledger automatically at finalization
- Agent Chit configuration UI/API alignment
- Automated unit/integration/concurrency tests
- Production auth provider abstraction
- Mobile application
