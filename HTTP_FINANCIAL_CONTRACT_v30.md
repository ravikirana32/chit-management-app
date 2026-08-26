# v30 HTTP Financial Contract

## Client requirements

Every financial mutation should carry a unique idempotency key.

Suggested headers:
`Idempotency-Key: payment:<obligationId>:<clientAttemptId>`

## Payment
POST payment -> server creates exactly one financial payment for the idempotency key.
Verification must be creator-authorized.

## Fixed draw
POST draw start -> server locks the month, calculates eligible participants, and records exactly one winner.

## Auction
Bid -> server validates auction state, participant eligibility, bid rules, and idempotency.
Finalize -> server locks auction and records exactly one winner.

## Payout
Create/settle -> idempotency required.
Settlement must not create duplicate ledger entries.

## Agent month
Agent month must:
- create normal member obligations
- skip draw
- skip auction
- create agent settlement
- create corresponding ledger entries
