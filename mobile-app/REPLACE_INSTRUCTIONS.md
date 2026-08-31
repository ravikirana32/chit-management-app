# Mobile app replacement V3

Replace the entire `mobile-app` directory with this folder.

```bash
rm -rf node_modules .expo
npm install
npx expo start -c
```

Set `.env`:

`EXPO_PUBLIC_API_URL=https://chit-management-app.onrender.com/api`

The app is Expo SDK 54.

## V3 fixes
- Agent dashboard uses `/v1/chits/my/agent-chits` and `/v1/agents/me/dashboard`.
- Agent users can open Members & Invitations from each assigned chit.
- Agent invitation uses mobile only; no user/participant ID entry.
- Admin can select an active agent from the agent list while creating a chit.
- Agent creating a chit uses the authenticated agent user ID automatically for AGENT_CHIT months.
- Auction monthly payout plan is always available and required for every month.
- Fixed draw failures show Retry + Back instead of an infinite loader.
- Winner screens resolve participant IDs to member names when participant list data provides names.
- Profile has a back button.
- Admin user and agent profile editing screens use the existing admin PUT APIs.
- API paths remain `/api/v1/...`; never use `/api/vv1/...`.
