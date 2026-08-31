# Mobile application audit — 2026-08-31

## Main issues found in the previous mobile app

1. `member-home.tsx` used `<View>` without importing `View`, causing `ReferenceError: Property 'View' doesn't exist`.
2. Dashboard routing was not truly role-specific; the application had an agent-oriented dashboard but no dedicated ADMIN dashboard and no complete member dashboard workflow.
3. Chit creation exposed an agent id field instead of resolving the logged-in AGENT automatically.
4. There was no ADMIN agent-selection UX for AGENT_CHIT months.
5. Role/creator/assignment permissions were not consistently used to hide operational buttons.
6. Invitation acceptance was not part of the primary member dashboard flow.
7. Fixed-draw interest/run controls and auction controls were not consistently role-gated.
8. Payment submission and payment verification needed separate role-aware presentation.
9. Admin user/agent management screens were missing from the mobile app.

## Backend contract used

- API prefix: `/api`
- API version: `/v1`
- Admin agent list: `GET /v1/admin/agents`
- Admin user list: `GET /v1/admin/users`
- Agent dashboard: `GET /v1/agents/me/dashboard`
- Agent-accessible chit: `GET /v1/agents/me/chits/:chitId`
- Member dashboard: `GET /v1/dashboard/me`
- Creator dashboard: `GET /v1/dashboard/chits/:chitId`
- Chit creation: `POST /v1/chits`
- Fixed draw: `/v1/draws/chits/:chitId/...`
- Auction: `/v1/auctions/...`
- Contributions: `/v1/payments/...`
- Payout settlement: `/v1/payouts/:id/settle`
- Ledger: `/v1/ledger/...`

## Agent id behavior

The backend create-chit contract accepts either an Agent record id or Agent user id for `agentId` and resolves it to an active Agent record. Therefore:

- ADMIN selects an active Agent record from the dropdown.
- AGENT does not manually enter an id; the app sends the authenticated AGENT user id automatically when AGENT_CHIT months are selected.

## Validation

The TypeScript source was syntax-checked with the TypeScript compiler parser. Dependency installation/build was not executed in the isolated generation environment because external npm installation timed out. Run `npm install` and `npx expo start -c` on the development Mac before device validation.
