# v45 Final Production Release Candidate

## Cumulative scope

This package preserves the cumulative v1 → v44 implementation and adds only the final release preflight/audit layer.

## Product capability checklist

### Chit
- Fixed Draw
- Auction
- Variable monthly amount
- Agent Month
- Creator / Member / Both roles
- Publish/lock lifecycle

### Payments
- Member UPI profile
- UPI payment submission
- Cash payment
- Creator records cash
- Authorized Agent records cash
- Payment verification
- Payment audit trail
- Idempotency foundation
- Historical payment source

### Winner
- Winner tracking
- Winner payment destination snapshot
- UPI/cash collection workflow foundation
- Payout tracking

### Existing chit migration
- Members
- Previous months
- Previous winners
- Previous payment records
- UPI/Cash historical methods
- Historical source tagging
- Import batches
- Validation
- Review
- Reconciliation
- Difference resolution
- Apply
- Activate

### Financial safety
- Creator ownership checks
- Participant ownership checks
- IDOR regression tests
- Financial authorization tests
- Final reconciliation
- Financial invariants
- Duplicate detection
- Historical/live separation

### Operations
- Notification preferences
- Creator operations dashboard
- Production Docker/NGINX/Redis/PostgreSQL baseline
- Backup script
- CI
- Swagger annotations
- Release preflight

## Final acceptance gate

Run in a real isolated staging environment:

```bash
cd chit_v5
npm ci
npm run build
npm run test:release
```

Then:

```bash
k6 run performance/k6-smoke.js
```

For an existing chit, test:

1. Import four completed months.
2. Import all members.
3. Import previous winners.
4. Import mixed UPI/cash payments.
5. Reconcile each month.
6. Resolve any difference.
7. Apply the batch.
8. Activate at current month.
9. Record a new cash payment as Creator.
10. Record a new cash payment as Agent.
11. Submit a UPI payment.
12. Run the next draw/auction.
13. Verify winner payment destination.
14. Run month close.
15. Run final reconciliation.

## Release status

Source/package completeness: READY FOR STAGING VALIDATION.

Production certification: NOT CLAIMED until the above tests are executed against the actual deployment environment.

No production secrets, signing keys, FCM/APNs credentials, cloud credentials or payment-provider credentials are included.
