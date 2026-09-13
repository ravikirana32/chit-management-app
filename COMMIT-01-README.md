# Commit 01 — Create Chit: Responsible Agent + AGENT_CHIT

Base branch: `experiment/commit-by-commit`
Repository: `ravikirana32/chit-management-app`

## Files to replace

- `mobile-app/app/create-chit.tsx`

No backend file is changed in this commit.

## What this fixes

1. ADMIN must select a responsible active agent when creating a chit.
2. The selected `agentId` is always sent to `POST /v1/chits`, instead of being sent only when AGENT_CHIT months are selected.
3. AGENT users continue to use their logged-in agent identity automatically.
4. AGENT_CHIT remains a month-level configuration; it is not converted into a separate top-level chit type.
5. The misleading `ACTION` month label is changed to `NORMAL`.

## Regression protection

- Fixed Draw and Auction remain the two top-level chit types.
- Existing monthly schedule calculation is preserved.
- Existing AGENT_CHIT month selection is preserved.
- No API contract is changed.
- No GitHub branch is modified by this ZIP.

## Apply

Replace only the file listed above in your local working tree.

**DO NOT COMMIT YET.**

Expected result: an ADMIN creating any chit can select the responsible agent, and the selected agent is persisted by the existing API. An AGENT creating a chit continues to use the logged-in agent identity automatically.

Next: **Commit 02 — completed-month lifecycle/action protection.**
