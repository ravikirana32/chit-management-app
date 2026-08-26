# Next Implementation

The next source increment should wire the above services into a real repository/service transaction using Sequelize models and the authenticated CurrentUser.

Then implement, in order:
1. Invitations
2. Payment submission and verification
3. Fixed Draw transaction
4. Auction + Redis + Socket.IO
5. Payout calculation and settlement
6. Ledger and notifications
7. Full tests/concurrency/security hardening
