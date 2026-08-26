# v29 Complete — Build Validation & Real Schema Contract

Cumulative package: v1 → v29.

Added:
- Migration 035 for remaining auction result columns
- Optional agent assignment during chit creation
- Jest E2E config
- Executable PostgreSQL schema-contract test
- Deterministic PostgreSQL test seed runner
- `test:schema`, `test:seed`, and `validate` scripts
- Finalized test schema checklist

Validation performed in this environment:
- Repository structure inspected
- Backend dependency tree inspected
- Static service/migration contract comparison performed
- Build execution attempted, but `node_modules` is not present in the supplied cumulative package, so `npm run build` could not actually execute here.

Run locally:
1. `cd chit_v5`
2. `npm ci`
3. `npm run db:migrate`
4. `TEST_DATABASE_URL=... npm run test:schema`
5. `TEST_DATABASE_URL=... npm run test:seed`
6. `npm run build`
7. `npm run test`

Next:
- Execute against a real PostgreSQL test database
- Fix any runtime/SQL issues surfaced by execution
- Add HTTP-level integration tests
- Add real auth test mode
- Add financial invariants and concurrency tests
- Final RC build
