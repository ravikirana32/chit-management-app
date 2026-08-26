# v24 Observability & Financial Safety

## Request correlation
Mobile API requests send:
- X-Request-Id
- X-Client-Version

The backend should log and propagate the request ID into financial audit records where supported.

## Financial mutations
The app requires an online connection before:
- Payment submission
- Auction bid

The server remains authoritative even when the client is online.

## Error handling
User-facing errors expose the backend message only when it is safe/appropriate. Never display:
- access tokens
- database credentials
- provider secrets
- raw SQL
- internal stack traces

## Recommended production telemetry
- API latency
- API error rate
- authentication failures
- payment submission failures
- payment verification failures
- auction bid rejection rate
- auction close failures
- payout settlement failures
- crash-free sessions

Financial events should be correlated with immutable backend audit records.
