# v28 Complete — Backend Contract Alignment

Cumulative package includes backend v1-v14 + mobile v15-v27 + v28.

Major fixes:
- Real DB-backed Chit create/list/detail/publish lifecycle
- Monthly schedule creation
- Variable monthly amount support
- Agent month selection before publish
- Corrected Agent Chit concept: agent month is a month type inside Fixed/Auction chit, not a third chit type
- Real participant list/invite API
- DB-backed authenticated user profile
- Member payment profile endpoint
- Payment verification restricted to chit creator
- Auction service aligned with existing `bids`/`auction_winners` schema
- Ledger signed `amount` compatibility column
- Chit rule columns added by migration
- User role/profile schema alignment
- Mobile create flow aligned to backend DTO
- Fixed draw API path aligned to backend

Migration:
- 033-align-financial-contract.js
- 034-unique-profile-role.js

Important:
Staging execution is still required. This version fixes code/schema mismatches discovered by inspecting the actual repository rather than claiming that external integration has passed.

Next:
- Run migrations and TypeScript build
- Fix any compile/runtime issues exposed by actual execution
- Add real DB seed runner
- Add API integration assertions
- Validate auction concurrency
- Validate payment/payout idempotency
- Complete release candidate
