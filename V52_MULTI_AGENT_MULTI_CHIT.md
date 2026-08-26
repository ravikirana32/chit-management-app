# v52 — Multi-Agent / Multi-Chit

## Capability

The platform supports:

- Many agents
- Many chits per agent
- Multiple agents on one chit
- Per-agent permissions
- Active/inactive assignment
- Agent portfolio dashboard
- Creator-controlled assignment

Example:

```text
Agent A → Chit 1, Chit 2, Chit 3
Agent B → Chit 4, Chit 5
Agent C → Chit 2, Chit 6
```

## Permissions

Each chit-agent assignment can independently control:

- View members
- Collect cash
- Verify payments
- Manage chat
- Run draw
- Run auction
- Manage chit

## Security

Every agent operation must validate:
1. authenticated user
2. agent role
3. active assignment
4. requested chit
5. permission for the operation

Changing a chit ID in a request must never grant access.

## Dashboard

Agent dashboard provides a portfolio-level view of active chits and member counts.

## Migration

This is additive. Existing creator/member/chit data is preserved.
