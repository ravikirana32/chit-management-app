# v37 Security Hardening

Required production controls:

## Authentication
- JWT access tokens must have short expiry.
- Refresh tokens must be rotated/revoked.
- OTP verification must be rate limited.
- Login/OTP endpoints must be protected from enumeration.

## Authorization
Creator-only:
- publish chit
- verify payment
- create/settle payout
- month close
- final reconciliation
- configure chit rules
- agent commission operations

Participant-only:
- submit own payment
- place own auction bid
- view own financial statement

## IDOR
Every resource URL must verify:
`resource -> chit -> creator/member -> current user`

Never authorize using only an object ID.

## Financial mutation
All mutation endpoints should use:
- transaction
- row lock where required
- idempotency key
- audit event

## Production rate limits
Recommended baseline:
- OTP request: 5 / 15 minutes / mobile
- OTP verify: 10 / 15 minutes / mobile
- Authenticated financial mutation: 60 / minute / user
- Auction bids: configured per auction/user
- Public API: IP-based limit

## Sensitive data
- Never return full bank account numbers.
- Mask UPI/bank details where not required.
- Do not log OTP, JWT, account number, IFSC or payment secrets.
