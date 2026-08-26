# v18 Complete — Agent, Payments, Ledger & Payout

Cumulative package includes backend v1-v14 + mobile v15-v17 + v18.

Added mobile:
- Agent Chit month screen
- Agent commission recording
- Member ledger screen
- Creator payout register
- Payout settlement
- Creator payment verification
- Payment rejection
- Notifications
- Profile and logout
- Home quick navigation

Financial rule preserved:
Agent Chit month has no draw and no bidding. Normal member contribution obligations continue, while the configured agent commission is accounted for separately.

Important:
Some payment-admin and participant endpoints depend on the exact backend controller names. They are isolated in `src/api/payment-admin.ts`, `src/api/ledger.ts`, etc., for easy contract alignment.

Next:
- Final endpoint contract alignment
- Member UPI/payment profile
- Creator vs member role guards
- Navigation shell/tabs
- Fixed draw winner/payout UX
- Auction winner/payout UX
- Full mobile integration tests
- E2E test setup
