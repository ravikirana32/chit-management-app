# v7 — Real-time Auction

## WebSocket namespace

`/auctions`

## Client events

### Join
`auction.join`

```json
{ "auctionId": "..." }
```

### Leave
`auction.leave`

```json
{ "auctionId": "..." }
```

## Server events

### auction.joined
Confirms room membership.

### auction.bid
Broadcast after a valid bid is committed:

```json
{
  "auctionId": "...",
  "participantId": "...",
  "bidAmount": 35000,
  "bidAt": "..."
}
```

### auction.closed
Broadcast after finalization.

## REST state

`GET /api/v1/auctions/:auctionId/state`

Returns:
- auction status
- open/close time
- remaining seconds
- scheduled chit amount
- current bid history
- winner/payout after completion

## Important security rule

WebSocket events are informational. Financial validation remains on the REST/service transaction boundary. A client cannot make a bid valid merely by emitting a WebSocket event.

Next:
- automatic close worker
- notification service
- auction reminders
- integration/concurrency tests
