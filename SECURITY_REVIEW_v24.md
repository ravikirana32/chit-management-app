# Security Review Checklist — v24

## Authentication
- [ ] OTP brute-force/rate-limit verified server-side
- [ ] Token expiry verified
- [ ] Refresh/re-auth flow verified
- [ ] Logout invalidates session as required

## Authorization
- [ ] Creator-only endpoints reject members
- [ ] Member endpoints reject unrelated participants
- [ ] Chit ownership checked server-side
- [ ] Payout settlement checked server-side

## Financial integrity
- [ ] Payment idempotency key
- [ ] Duplicate verification protection
- [ ] Auction bid transaction/locking
- [ ] Draw transaction/locking
- [ ] Payout idempotency
- [ ] Month lock enforcement
- [ ] Immutable audit ledger

## Privacy
- [ ] UPI/bank details encrypted/protected appropriately
- [ ] Sensitive data excluded from logs
- [ ] User deletion/export policy
- [ ] Privacy policy published

## Mobile
- [ ] No secrets in bundle
- [ ] Secure native token storage
- [ ] Certificate/network security reviewed
- [ ] Debug logs disabled in release
