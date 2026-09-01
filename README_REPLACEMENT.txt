# Direct replacement — Chit lifecycle
Changes:
- Backend adds POST /v1/chits/:id/start.
- READY_TO_START is treated as published/locked.
- Start moves READY_TO_START -> ACTIVE transactionally after verifying a first month exists.
- Setup screen is read-only for READY_TO_START; Save/Publish are hidden.
- Chit detail shows Start Chit / Month 1 only for READY_TO_START.
- Monthly operational buttons are shown only for the current month while ACTIVE.
- Mobile API adds chitsApi.start().
