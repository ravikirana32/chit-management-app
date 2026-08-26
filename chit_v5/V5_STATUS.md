# v5 — Fixed Draw complete increment

Added:
- missing NestJS PostgreSQL/Sequelize database module
- base migrations 001–005 for users, agents, chits, participants and months
- Fixed Draw API
- eligibility snapshot
- previous-winner exclusion
- default/overdue/dispute exclusion
- transaction and row locking
- random winner selection
- winner persistence
- payout creation
- month completion
- audit event
- Swagger metadata

The authentication OTP provider remains a development integration point and must be replaced before production deployment.
