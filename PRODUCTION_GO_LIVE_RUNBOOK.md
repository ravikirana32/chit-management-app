# Production Go-Live Runbook

## A. Before deployment

- [ ] Domain configured
- [ ] TLS certificate active
- [ ] DNS correct
- [ ] Firewall configured
- [ ] PostgreSQL backup configured
- [ ] Restore tested
- [ ] Redis configured
- [ ] Object storage private
- [ ] Production secrets configured
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Android production API configured
- [ ] iOS production API configured

## B. Database

- [ ] Take final backup
- [ ] Verify backup file
- [ ] Run migrations in staging
- [ ] Compare schema
- [ ] Run production migration during approved window

## C. API

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 api
```

Verify health/readiness endpoints.

## D. Smoke test

1. Creator login
2. Create/open chit
3. Member login
4. View obligation
5. UPI payment flow
6. Cash payment flow
7. Payment proof
8. Verification
9. Dispute
10. Reconciliation
11. Chat
12. Notification

## E. Mobile

### Android
- [ ] Install production build
- [ ] Login
- [ ] API connectivity
- [ ] UPI flow
- [ ] Cash flow
- [ ] Screenshot
- [ ] Chat
- [ ] Push notification

### iOS
- [ ] TestFlight build
- [ ] Login
- [ ] API connectivity
- [ ] UPI flow
- [ ] Cash flow
- [ ] Screenshot
- [ ] Chat
- [ ] Push notification

## F. Go-live

Start with a controlled rollout.

Monitor:
- API errors
- payment claims
- payment disputes
- reconciliation
- notifications
- chat errors
- database health

## G. Rollback

If a release causes a severe problem:

1. Stop rollout.
2. Preserve logs.
3. Identify affected transactions.
4. Roll back application version.
5. Do NOT blindly roll back database migrations.
6. Restore database only when required and after impact assessment.
7. Reconcile financial records.
8. Confirm service health.
9. Resume after approval.
