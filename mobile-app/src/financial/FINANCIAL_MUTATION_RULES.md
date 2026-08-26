# Financial mutation rules

For payment, draw, auction finalization and payout mutations:
1. Generate an idempotency key.
2. Send it to the backend when the endpoint supports the `Idempotency-Key` header.
3. Never retry a mutation blindly with a new key.
4. If a timeout occurs, retry using the SAME key.
5. Treat backend result as authoritative.
