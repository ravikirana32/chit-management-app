# v17 Complete — Roles, Members & Fixed Draw

Cumulative package includes backend v1-v14 + mobile v15-v16 + v17.

Added:
- Authenticated user profile bootstrap
- User context in Redux
- Real create-chit API integration
- Real chit rules update during creation
- Real member list/invite integration
- Real publish integration
- Fixed Draw mobile screen
- Draw API integration
- Notifications mobile screen
- Creator/member-aware foundation

Important:
Backend route names can differ depending on the existing controller implementation. API adapters are isolated under `mobile-app/src/api`, so endpoint changes can be made there without changing screens.

Next:
- Complete backend/mobile endpoint contract verification
- Agent month management UI
- Creator payment verification
- Member UPI profile/payment preference
- Ledger and payout screens
- Role-aware navigation guards
- App theme/navigation shell
- End-to-end mobile tests
