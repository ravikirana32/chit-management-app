# Fixed Draw — v5

`POST /api/v1/draws/chits/:chitId/start`

The transaction locks the month, validates creator ownership and month type, snapshots eligible participants, randomly selects one winner, persists the winner, creates a payout, completes the draw/month, and writes an audit record.

Eligibility excludes:
- inactive/suspended participants
- previous Fixed Draw winners
- previous Auction winners
- participants with OVERDUE/DEFAULTED/DISPUTED obligations

The winner is **not removed from the chit**. Existing future contribution obligations remain unchanged.
