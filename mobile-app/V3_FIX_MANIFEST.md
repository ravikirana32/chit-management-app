# Chit Management Mobile — V3 Replacement Manifest

Built for Expo SDK 54 and the current backend API contract.

## Included fixes
1. Role-aware dashboards: ADMIN, AGENT and MEMBER.
2. AGENT dashboard loads assigned chits from `/v1/chits/my/agent-chits` and dashboard metrics from `/v1/agents/me/dashboard`.
3. AGENT can access Members & Invitations for each assigned chit when the backend grants `can_manage_chit`.
4. AGENT invitation is mobile-number based; no agent/user/participant ID is required.
5. ADMIN sees active agents in a selector while creating a chit.
6. AGENT uses the authenticated user identity automatically when creating AGENT_CHIT months.
7. Auction monthly payout plan remains visible and editable for every month.
8. Fixed Draw load failures provide Retry and Back instead of leaving an infinite loader.
9. Fixed Draw winner resolves to participant/member name when participant data contains it.
10. Auction winner resolves to participant/member name when participant data contains it.
11. Profile has a Back button.
12. ADMIN can edit user details using `PUT /v1/admin/users/:id`.
13. ADMIN can edit agent details using `PUT /v1/admin/agents/:id`.
14. API base remains `/api/v1`; no `vv1` is used.
15. Expo SDK 54 package versions retained.

## Installation
```bash
cd mobile-app
rm -rf node_modules .expo
npm install
npx expo start -c
```

`.env`:
```env
EXPO_PUBLIC_API_URL=https://chit-management-app.onrender.com/api
EXPO_PUBLIC_DEV_LOGIN=true
```

## Validation
All `.ts` and `.tsx` files were passed through TypeScript's `transpileModule` parser with JSX enabled and produced zero syntax diagnostics. A full typecheck/device build still requires the npm dependencies and a real iPhone/Expo Go environment.
