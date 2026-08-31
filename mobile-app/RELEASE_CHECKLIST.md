# Mobile vNext validation checklist

- Set `EXPO_PUBLIC_API_URL` to the deployed API.
- Login with a registered mobile; OTP endpoint currently accepts the backend's configured OTP behavior.
- Verify `/v1/users/me` returns the user's roles and `participantId` where applicable.
- Creator: create draft → edit monthly schedule → invite all members → accept invitations → publish.
- Fixed Draw: open interest → member interest → verify collections → run draw → settle payout → close month.
- Auction: open on scheduled date → members bid → finalize → settle payout → close month.
- Agent month: all members contribute → settle agent month → close month.
- Test UPI, CASH and BANK_TRANSFER contribution references.
- Test payment idempotent retry.
- Test offline financial mutation blocking before release.
- Test Android and iOS release builds.
