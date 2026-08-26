# Mobile UX v38

## Roles
A user can be:
- Creator
- Member
- Both

## Creator navigation
Dashboard → My Chits → Chit Detail → Members → Schedule → Payments → Draw/Auction → Payout → Reconciliation

## Member navigation
Dashboard → My Chits → Chit Detail → My Obligations → Payment → Auction → Winner/Payout → Profile

## Agent month
Always visually distinct:
`AGENT MONTH — NO DRAW / NO BID`

## Financial UX
- Confirmation before financial mutation
- Clear amount
- Month number
- Chit name
- Payment method
- Idempotency-safe retry
- Success receipt
- Error with retry
- Offline blocking for financial mutation

## Accessibility
Every actionable control must have:
- accessibilityRole
- accessibilityLabel
- stable testID
