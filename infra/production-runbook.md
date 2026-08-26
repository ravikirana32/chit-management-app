# Production deployment runbook

1. Create secrets outside source control.
2. Provision PostgreSQL with automated backups and point-in-time recovery where supported.
3. Provision Redis with persistence appropriate to the event/queue workload.
4. Configure TLS certificates for NGINX.
5. Configure `.env.production`.
6. Build immutable API image.
7. Run database migrations before routing traffic to the new API.
8. Verify `/health` and readiness.
9. Smoke-test authentication and a non-financial read endpoint.
10. Enable traffic.
11. Monitor errors, latency, DB connections and Redis health.
12. Never run destructive migrations automatically without backup/review.
13. For financial incidents, stop mutation traffic before repairing ledger state.
