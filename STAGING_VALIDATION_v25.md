# v25 Staging Validation Plan

## Preconditions
- Dedicated staging PostgreSQL database
- Staging API and Socket.IO
- Test payment provider/sandbox
- Test OTP provider
- Seed creator and member accounts
- No production credentials/data

## Smoke tests

### Authentication
- Request OTP
- Verify OTP
- Restore session
- Logout

### Chit lifecycle
- Creator creates Fixed Chit
- Creator creates Auction Chit
- Configure monthly amounts before publish
- Configure Agent months before publish
- Invite members
- Finalize members
- Publish
- Verify published rules are immutable

### Fixed Chit
- Create monthly obligation
- Collect member payment
- Verify payment
- Execute draw
- Confirm previous winner is excluded
- Create payout
- Settle payout
- Verify ledger

### Agent Month
- Confirm no draw
- Confirm no auction
- Confirm all members still have obligations
- Record agent commission
- Verify ledger

### Auction
- Open auction
- Join auction room
- Submit valid bid
- Reject invalid bid
- Close after maximum window
- Finalize winner exactly once
- Create payout
- Verify ledger

### Collections
- Grace period
- Overdue
- Default
- Recovery plan
- Payment after recovery
- Month lock

## Exit criteria
- No P0/P1 financial defects
- All financial invariants pass
- No duplicate payment/settlement/draw/auction finalization
- Creator/member authorization tests pass
- Android smoke test passes
- iOS smoke test passes
