# Chit Management Mobile vNext

React Native / Expo Router client aligned to the current `chit_v5` API.

## Run

1. `npm install`
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
3. `npm start`
4. `npm run typecheck`

The app uses the authenticated `/v1/users/me` response to determine role. Financial mutations are blocked offline and use an idempotency key where supported.

## Main flows

- Login / OTP
- Creator/Agent dashboard
- Member dashboard
- Create chit + variable monthly contribution/payout schedule
- Agent-chit months
- Invitations and acceptance
- Fixed draw: open interest → express interest → run draw → payout → month close
- Auction: open → live state → bid → finalize → payout → month close
- Contributions: obligations → payment submit → creator verification → verification-all
- Cash recording
- Payout settlement with CASH/UPI/BANK_TRANSFER
- Savings, operations summary and ledger
- Notifications and payment profile
