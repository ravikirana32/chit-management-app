# v50 — Final Release Audit

## Purpose

v50 does not add another large business feature. It consolidates the project into a final release-audit stage.

## What is covered

### Build
- Backend dependency installation
- Backend production build
- Cumulative release test suite
- Docker Compose configuration validation

### Financial
- UPI direct-to-winner workflow
- Cash collection
- Creator/Agent marking
- Winner confirmation
- Payment proof
- Dispute
- Historical migration
- Reconciliation

### Communication
- Chit chat
- Pagination
- Idempotent messages
- Moderation
- Notification events
- Push-token registration foundation

### Deployment
- Docker configuration
- Production environment separation
- Backup/restore checklist
- Beginner deployment documentation

## Required external gates

These cannot be truthfully marked PASS from source-code inspection:

1. Real staging database
2. Real Android device
3. Real iPhone/TestFlight
4. FCM/APNs credentials
5. Real private object storage
6. Real UPI apps
7. Real concurrent users
8. Real backup and restore
9. TLS/domain configuration
10. Cloud monitoring

## Release decision

Use this sequence:

```text
v50 source audit
      ↓
clean install
      ↓
build
      ↓
automated tests
      ↓
staging deployment
      ↓
financial scenario tests
      ↓
two-device chat tests
      ↓
Android device test
      ↓
iOS TestFlight test
      ↓
backup/restore test
      ↓
security review
      ↓
PRODUCTION RELEASE
```

Do not call the application production-certified until the external gates pass.
