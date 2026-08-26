# Chit App v1.0 Release Candidate — v41

## Product rules locked

### Two chit types
1. FIXED_DRAW
2. AUCTION

### Agent month
Agent month is NOT a third chit type.

The creator selects agent month numbers before publishing.

For an agent month:
- Every member pays the normal scheduled amount.
- No draw.
- No bidding.
- Amount/commission is settled to the configured agent.

### Variable monthly amounts
The creator may configure each month's amount before publishing.

Example:
Month 1 ₹2,00,000
Month 2 ₹2,10,000
Month 3 ₹1,95,000

After publish, the schedule must be treated as locked.

## User roles

A user may be:
- Creator
- Member
- Both

## Release acceptance

Backend:
- [ ] Build passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Financial invariants pass
- [ ] Security tests pass
- [ ] Swagger audit passes
- [ ] Migrations pass on clean DB
- [ ] Migrations pass on upgrade DB
- [ ] Docker image builds

Mobile:
- [ ] Creator flow complete
- [ ] Member flow complete
- [ ] Fixed Draw flow complete
- [ ] Auction flow complete
- [ ] Agent Month flow complete
- [ ] Payment flow complete
- [ ] Payout flow complete
- [ ] Offline/error/loading states
- [ ] Notifications
- [ ] Accessibility

Production:
- [ ] Secrets configured externally
- [ ] TLS configured
- [ ] PostgreSQL backups verified
- [ ] Redis configured
- [ ] NGINX configured
- [ ] CI passes
- [ ] Monitoring configured
- [ ] Rollback tested

## Financial sign-off

Do not release until:
- duplicate payment test passes
- duplicate payout test passes
- duplicate draw winner test passes
- duplicate auction winner test passes
- duplicate agent commission test passes
- final reconciliation passes
- month close passes
