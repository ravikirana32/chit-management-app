# Chit Funds v23 Release Candidate

Cumulative backend + mobile package.

Financial safety principles:
- Backend is source of truth.
- Client-side role checks never grant authorization.
- No blind offline financial mutations.
- Payments require backend verification.
- Auction finalization is server authoritative.
- Fixed draw is server authoritative.
- Agent months have no draw/bid action.
- Production E2E must never use production data.
