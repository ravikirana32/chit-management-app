# v45 Release Checklist

## Build
- [ ] npm ci
- [ ] npm run build
- [ ] npm run test:release

## Database
- [ ] Clean database migration
- [ ] Upgrade migration
- [ ] Backup verified
- [ ] Restore verified

## Security
- [ ] Creator/member authorization
- [ ] IDOR tests
- [ ] Financial mutation authorization
- [ ] Rate limiting
- [ ] Secrets outside source control

## Payments
- [ ] UPI member profile
- [ ] Member UPI payment
- [ ] Member cash declaration
- [ ] Creator cash marking
- [ ] Agent cash marking
- [ ] Verification
- [ ] Duplicate payment prevention
- [ ] Ledger reconciliation

## Existing chit
- [ ] Import members
- [ ] Import previous winners
- [ ] Import previous payments
- [ ] Mixed UPI/cash
- [ ] Reconcile
- [ ] Resolve differences
- [ ] Apply
- [ ] Activate

## Chit lifecycle
- [ ] Fixed Draw
- [ ] Auction
- [ ] Agent Month
- [ ] Month close
- [ ] Payout
- [ ] Final reconciliation

## Mobile
- [ ] Creator flow
- [ ] Member flow
- [ ] Payment flow
- [ ] Cash flow
- [ ] Draw
- [ ] Auction
- [ ] Notifications
- [ ] Offline/error/loading
- [ ] Accessibility

## Production
- [ ] Docker
- [ ] PostgreSQL
- [ ] Redis
- [ ] NGINX/TLS
- [ ] Backup
- [ ] CI
- [ ] Monitoring
- [ ] Android release build
- [ ] iOS release build
