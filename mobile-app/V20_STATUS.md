# v20 Complete — Role Navigation & Dashboards

Cumulative package includes backend v1-v14 + mobile v15-v19 + v20.

Added:
- Authenticated startup redirect
- Creator/member role resolution
- Role-aware dashboard
- Creator collection exception screen
- Member monthly schedule screen
- Creator quick links
- Member quick links
- Central navigation role helper

Role model:
CREATOR / OWNER / CHIT_CREATOR -> Creator experience
All other authenticated users -> Member experience

This is a foundation; final production navigation should use backend authorization as the source of truth, not only client-side roles.

Next:
- Production navigation tabs
- Backend role/permission contract alignment
- Creator monthly operations dashboard
- Member contribution dashboard
- Offline/error/retry handling
- Secure token storage
- Mobile E2E tests
- Release configuration
