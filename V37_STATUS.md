# v37 Complete — Security & Authorization Audit

Cumulative package: v1 → v37.

Added:
- Central resource ownership service
- IDOR regression suite
- Creator/member authorization matrix
- Payment verification authorization tests
- Payout settlement authorization tests
- Auction finalization authorization tests
- Security configuration regression tests
- Production security hardening checklist
- Expanded RC suite

Security model:
Creator-only financial administration; participants can mutate only their own participant-scoped financial actions.

Important:
This version adds automated regression coverage and security requirements. A penetration test and external staging execution are still required before production.

Next v38:
- Complete mobile UX/app flows
- Creator/member dashboards
- Fixed draw and auction journeys
- Agent-month screens
- Payment/payout UI
- Empty/error/offline/accessibility states
