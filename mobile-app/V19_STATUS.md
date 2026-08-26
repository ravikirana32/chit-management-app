# v19 Complete — Roles, Payment Profile, Winners & Payout UX

Cumulative package includes backend v1-v14 + mobile v15-v18 + v19.

Added:
- Member payout/payment profile screen
- UPI ID
- Bank account/IFSC foundation
- Cash payout preference
- Winner history
- Fixed draw winner history
- Auction winner history
- Winner detail screen
- Payout status display
- Auction now uses authenticated participant context instead of the previous hard-coded placeholder
- Home navigation to payment profile

Important:
The backend must expose `participantId` in the authenticated user context or dashboard membership context for auction bidding. The mobile adapter should map the actual backend field if it uses a different name.

Next:
- Role-aware navigation guard implementation
- Creator/member tab shell
- Creator collections dashboard
- Creator auction controls
- Member payment schedule
- Member contribution history
- Production secure storage
- Mobile E2E tests
- Release configuration
