# Chit App Database Source v2

This package is the next implementation increment.

Included:
- Sequelize model source for core domain models
- PostgreSQL migrations
- pgcrypto UUID support
- Core constraints
- Creator/Participant model
- Variable monthly amounts
- Agent Chit Month representation
- Payment, draw, auction, payout, ledger, audit tables

Important:
- The migration files are a source baseline and should be reviewed against the final PostgreSQL version before production.
- Business rules such as "Agent Chit cannot have draw/auction" are enforced in domain services/transactions, not by trusting the client.
- Financial records remain append-only at the application layer.
