# Chit App API Contract — Current Baseline

Base path: `/api/v1`

Swagger UI: `/docs`

## Current foundation

- `GET /api/v1/health`
- `POST /api/v1/auth/request-otp`
- `POST /api/v1/auth/verify-otp`
- `GET /api/v1/users/me`
- `POST /api/v1/chits`
- `GET /api/v1/chits`
- `GET /api/v1/chits/:id`
- `GET /api/v1/chits/:id/months`
- `PATCH /api/v1/chits/:id/months/:monthId`
- `POST /api/v1/chits/:id/publish`

## Publish contract

Publishing must be a database transaction.

Validation:
1. User is creator or authorized co-organizer.
2. Chit is not already published.
3. Active participant count equals configured total members.
4. All monthly entries exist.
5. Month numbers are unique and complete.
6. Every amount is positive.
7. Agent Chit Month has an agent.
8. Non-Agent month has no agent.
9. Creator participation is consistent with participant records.
10. Configuration is locked after successful commit.

## Financial invariant

A participant who wins a Fixed Draw or Auction remains an active participant and continues to receive contribution obligations for future months.
