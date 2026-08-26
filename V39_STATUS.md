# v39 Complete — Notifications & Operations

Cumulative package: v1 → v39.

Added:
- Notification preferences table/migration
- Notification preferences API
- Payment reminder preference
- Auction alert preference
- Winner alert preference
- Payout alert preference
- Overdue alert preference
- Member update preference
- Push enable/disable preference
- Creator operational summary API
- Mobile notification preferences screen
- Mobile operations dashboard
- Notification/operations integration tests

The notification foundation intentionally separates preferences from the actual push provider. FCM/APNs provider wiring belongs in production infrastructure hardening.

Next v40:
- Docker/Compose production configuration
- Redis
- NGINX
- Push provider architecture
- CI/CD
- Health/readiness
- Logging/metrics
- Secrets/environment management
- Database backup/migration strategy
