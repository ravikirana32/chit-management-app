# Main-branch verification — Mobile V4

Checked against `ravikirana32/chit-management-app` `main` on 2026-08-31.

| # | Requirement | Result | Finding / fix |
|---|---|---|---|
| 1 | RN Text strings error | FIXED IN V4 | Main had one-line JSX with whitespace between sibling expressions/elements. V4 removes JSX whitespace text nodes across `.tsx`. |
| 2 | Agent Dashboard uses assigned chits | PARTIALLY BROKEN IN MAIN | Mobile calls `/v1/chits/my/agent-chits` and `/v1/agents/me/dashboard`, but main compares `assignment.agent_id` directly with JWT user ID. Backend patch fixes user/agent identity mapping. |
| 3 | Agent can open Members & Invitations | IMPLEMENTED | Dashboard has Members & Invitations route; Members screen loads participants and access. |
| 4 | Agent can invite by mobile | IMPLEMENTED | Uses `/v1/chits/{chitId}/participants/invite` with mobile validation. |
| 5 | Invited user accepts invitation | IMPLEMENTED | Dashboard loads invitations and calls accept endpoint. |
| 6 | Invitation mobile validation | IMPLEMENTED | Minimum 10 digits before API call. |
| 7 | Fixed-draw winner member name | IMPLEMENTED BUT NEEDS ROBUSTNESS | V4 retains participant-to-member name resolution. |
| 8 | Auction winner member name | IMPLEMENTED BUT NEEDS ROBUSTNESS | V4 retains participant-to-member name resolution. |
| 9 | Auction monthly payout plan | IMPLEMENTED | Scheduled contribution and planned payout are displayed. |
| 10 | `/api/v1` preserved | VERIFIED | API client normalizes base URL to `/api`; calls use `/v1/...`. |
| 11 | TypeScript syntax/transpile | MAIN CLAIM WAS NOT RELIABLE | Main contains a missing `isAgent` import in auction/fixed-draw, and install could not complete in this environment. V4 fixes the missing imports; local syntax is structurally corrected. |
| 12 | ZIP integrity | VERIFIED | New ZIP is generated and tested with `unzip -t`. |

## Additional main-branch defects found

- `fixed-draw.tsx` sent `{monthId}` to `StartDrawDto`; backend requires `chitMonthId`. V4 fixes this.
- Fixed Draw UI only rendered the start action after a successful GET of an existing draw. V4 treats a missing draw as `NOT_STARTED`, allowing the creator/authorized agent to open it.
- `auction.tsx` sent `startsAt` while the backend DTO requires `durationMinutes`. V4 sends `durationMinutes: 60`.
- `auction.tsx` did not send the required `participantId` when placing a bid. V4 sends the authenticated user's `participantId` and validates it before bidding.
- Server-side Fixed Draw start/run in `main` was creator-only. Backend patch changes this to creator OR assigned agent with `can_run_draw`.
- Server-side Auction permission already supports agents, but its assignment lookup has the same user-id vs agent-id mismatch. Backend patch fixes it.
