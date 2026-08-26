# Chit App Backend v5 — consolidated

This is the consolidated baseline after the Payment and Fixed Draw increments.

## Included
- NestJS + TypeScript
- PostgreSQL + Sequelize
- Swagger/OpenAPI
- JWT guard foundation
- Chit APIs
- Variable monthly amount configuration
- Agent Chit month configuration
- Payment submission/verification
- Fixed Draw execution
- Draw eligibility snapshot
- Winner/payout/audit persistence
- Base migrations 001–005 plus the existing financial-domain migrations

## Run
```bash
cp .env.example .env
npm install
npm run db:migrate
npm run start:dev
```

Swagger: `http://localhost:3000/docs`

## Production note
OTP verification is intentionally a development stub. Connect a real OTP provider before production. Financial actions must also have role/authorization policy enforced beyond the current creator/user boundary.

## Next milestone
Auction/Bidding: scheduled 1-hour bid window, real-time bid updates, bid validation, close/finalize, winner, discount/net payout, and settlement.
