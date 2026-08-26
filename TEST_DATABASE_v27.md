# Test Database v27

The test suite must use an isolated database.

Required reset strategy:
1. Disable/stop test workers.
2. Reset schema or transaction fixtures.
3. Seed creator.
4. Seed members.
5. Seed fixed and auction chits.
6. Seed memberships.
7. Seed deterministic months/obligations.
8. Seed agent month.
9. Seed no production identifiers.
10. Run tests.
11. Tear down.

Financial tests should assert both:
- API response
- Database state/ledger state
