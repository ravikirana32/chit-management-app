# Chit Management Mobile v2 — replacement package

This package replaces the repository `mobile-app` folder.

## Install

1. Backup the existing `mobile-app` folder.
2. Replace its contents with this folder.
3. Create `.env` from `.env.example`:

```env
EXPO_PUBLIC_API_URL=https://chit-management-app.onrender.com/api
EXPO_PUBLIC_DEV_LOGIN=true
```

4. Run:

```bash
npm install
npx expo start -c
```

## Role behavior

### ADMIN
- Admin dashboard
- User management
- Agent profile management
- Agent dropdown while creating a chit
- Create/manage chits
- Creator-level operations when the admin is the chit creator

### AGENT
- Agent dashboard
- Assigned chit portfolio
- Create chit
- AGENT_CHIT months automatically use the logged-in agent user id; the backend resolves user id to the active agent profile
- Draw/auction/collection controls appear only when assignment permissions allow them

### MEMBER
- Member dashboard
- Pending invitations and accept
- Monthly obligations
- UPI/CASH/BANK_TRANSFER contribution submission
- Fixed draw interest
- Auction bidding
- My ledger
- Payment profile
- Notifications/preferences

### Creator overlay
A user who created a chit receives creator controls for that chit even if the user is not ADMIN.

## Important
The UI hides actions based on role/creator/agent-assignment permissions, but the backend remains the final authorization layer.
