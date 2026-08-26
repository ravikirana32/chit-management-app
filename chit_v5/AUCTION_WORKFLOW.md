# Auction/Bidding v6

## Open auction
POST /api/v1/auctions/chits/:chitId/open

- Creator only
- Auction chit only
- Agent Chit month cannot be auctioned
- Duration is 1–60 minutes
- Month becomes BIDDING
- Close time is stored server-side

## Place bid
POST /api/v1/auctions/:auctionId/bids

- Authenticated participant
- Participant must belong to the authenticated user
- Participant must be ACTIVE
- Participant must not have won a previous month
- Bid must be > 0 and < scheduled amount
- Server timestamp is used
- Bids cannot be placed after close time

## Finalize
POST /api/v1/auctions/:auctionId/finalize

- Creator only
- Cannot finalize before close time
- Highest valid discount wins
- Exact tie is resolved by earliest bid
- Winner payout = scheduled amount - winning discount
- Winner remains active and continues future contributions
- Winner and payout are audited

## Example

Scheduled chit amount: ₹2,00,000

A bids ₹20,000
B bids ₹35,000
C bids ₹25,000

B wins.

Winner payout:
₹2,00,000 - ₹35,000 = ₹1,65,000

### Important business decision still to finalize

The discount distribution model must be configurable before production. Possible models:
1. Equal benefit to all members.
2. Reduce each member's contribution.
3. Organizer/service commission.
4. Other legally approved chit convention.

The current engine records the discount and calculates the winner payout; it does not silently assume how the discount is distributed to members.
