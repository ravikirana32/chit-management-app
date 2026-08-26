# Production health/readiness

Liveness:
`GET /health`

Readiness should verify:
- API process alive
- PostgreSQL connectivity
- Redis connectivity
- migrations at expected version

A readiness failure must not necessarily terminate the container immediately; the orchestrator should remove it from traffic first.
