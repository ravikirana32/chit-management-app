# v49 Complete — Staging Hardening

Cumulative package: v1 → v49.

Added:
- Paginated chat history
- Idempotent chat send
- Presence heartbeat foundation
- Push token registration
- Socket.IO leave/reconnect lifecycle foundation
- Mobile chat connection helper
- Staging acceptance checklist
- Reliability and restore checklist
- v49 integration tests

The next step should be actual staging execution, not another feature by default.

Only after staging passes should we decide whether a v50 release candidate is necessary.
