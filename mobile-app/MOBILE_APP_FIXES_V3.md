# Mobile App V3 fixes

This replacement is based on the current mobile-app API contract and the SDK 54 application.

## Role behaviour
- ADMIN: admin dashboard, users, agents, create chit, all creator-level chit actions where backend permits.
- AGENT: dedicated dashboard uses `/v1/chits/my/agent-chits`; no need to know an agent ID; agent invitation is available only when the assigned agent has `can_manage_chit` permission.
- MEMBER: member dashboard, invitations, contributions, fixed-draw interest and auction bidding.
- Creator access is evaluated from the chit `creator_id` and never by hiding backend authorization.

## Agent invitations
Open a chit -> Members & Invitations -> Invite User. Enter only the user's mobile number. The app calls:
`POST /v1/chits/{chitId}/participants/invite`

No user ID, participant ID or agent ID is required.

## Fixed draw
- Loading failures now show Retry and Back instead of an infinite loader.
- Winner display resolves participant ID to a member name when participant data contains it.

## Auction
- Planned monthly payout remains visible.
- Winner display resolves participant ID to member name when available.

## API
The app keeps `/api/v1` through the normalized API client. Do not configure `vv1`.
