# CHIT Winner Reveal Enterprise V1

Directly replace these files in the repository at the exact paths stored in this ZIP.

## What is included

1. Secure server-side winner reveal lifecycle for Fixed Draw and Auction.
2. Configurable reveal duration, clamped to 30-45 seconds; default 40 seconds.
3. Server-authoritative reveal timestamps.
4. Winner is hidden from API state while `REVEALING`.
5. Winner becomes visible only after `REVEALED`.
6. Realtime Socket.IO reveal notifications.
7. JWT authentication and chit-access authorization for reveal sockets.
8. Auction websocket authentication hardened against client-supplied user IDs.
9. Auction state API now authorizes access and hides winner-specific financial values during reveal.
10. Fixed Draw access now permits creator/admin/eligible participant/authorized active agent.
11. Start Chit now selects the first non-locked/non-completed month instead of blindly using Month 1.
12. Mobile Fixed Draw and Auction screens include synchronized animated reveal UI.
13. Mobile API file starts from the latest uploaded `all(1).ts` and preserves APIs required by the rest of the current mobile application.
14. Admin user/agent/member/chit lifecycle UI and backend integration are included.

## Migration

Run:

`054-winner-reveal-lifecycle.js`

before exercising winner reveal.

## Optional environment variable

`WINNER_REVEAL_SECONDS=40`

The backend clamps this value to 30-45 seconds.

## Important behavior

The database commits the winner before the animation begins. The mobile app only receives winner identity after the server reveal window expires. A disconnected/reconnected device recovers the authoritative state through the normal API.

## Validation

The package was checked for TypeScript syntax diagnostics and JavaScript migration syntax. Full `npm install`, Nest build, Expo build, migration execution against PostgreSQL, websocket runtime tests, and staging E2E certification must still be run in the real deployment environment.

## Replacement rule

Do not merge these files selectively from older packages. Replace the listed paths from this package together so the backend and mobile reveal contracts remain synchronized.
