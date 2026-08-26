# Workflow Implementation v3

This increment defines the production transaction boundary for the first complete chit workflow.

## Flow
Create Draft -> Add Participants -> Configure Monthly Schedule -> Review -> Publish -> Generate Contribution Obligations -> Lock Configuration.

## Rules
- Exactly `total_members` active participants are required before publish.
- Exactly `total_months` monthly schedule rows are required.
- Every monthly amount must be positive and can vary month-to-month.
- `AGENT_CHIT` requires an agent and has no draw/auction action.
- `ACTION` months cannot have an agent.
- After publish, participant membership and monthly configuration are locked.
- Every active participant gets one contribution obligation for every month.
- A participant who wins a draw/auction continues paying future months.
- Publish, obligation generation, month locking and audit logging belong in one database transaction.

## API contract
- POST /api/v1/chits
- POST /api/v1/chits/:id/participants
- POST /api/v1/chits/:id/months/schedule
- POST /api/v1/chits/:id/publish

The current scaffold still uses a development actor ID until JWT CurrentUser/guard is wired. Do not deploy that placeholder to production.
