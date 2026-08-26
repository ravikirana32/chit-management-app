# v14 Hardening Test Matrix

## Payments
- Amount > outstanding → reject
- Duplicate verification → reject
- Partial payment → PARTIAL
- Full payment → VERIFIED
- Wrong participant → reject
- Concurrent verification → only one financial credit

## Fixed Draw
- Creator-only execution
- Agent month rejected
- Previous winner excluded
- Defaulted participant excluded
- One winner only
- Winner remains active
- Duplicate draw prevented

## Auction
- Maximum 60-minute window
- Bid after close rejected
- Bid >= pot rejected
- Previous winner rejected
- Wrong participant rejected
- Highest discount wins
- Earliest timestamp wins ties
- Duplicate finalization prevented
- Concurrent finalization serialized

## Payouts
- Creator-only settlement
- Already settled payout rejected
- Settlement creates exactly one ledger reference
- Failed payout does not create settlement ledger debit

## Month close
- Pending obligation blocks lock
- Pending payout blocks lock
- Fully reconciled month can lock
- Locked month cannot be mutated by normal financial workflows

## Collections
- Per-chit grace period used
- Overdue transition
- Default transition
- Default does not remove member
- Duplicate reminder protection

## Recovery
- Plan must cover outstanding amount
- Installment generation is idempotent
- Payment remains processed through central payment workflow
