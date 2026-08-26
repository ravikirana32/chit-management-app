# Database Source

The database layer follows Database Design v2.

Migration order:
1. users
2. user_roles
3. user_payment_profiles
4. user_devices
5. chits
6. chit_participants
7. invitations
8. agents
9. chit_months
10. contribution_obligations
11. payments
12. payment_verifications
13. draws
14. draw_participants
15. draw_winners
16. auctions
17. auction_participants
18. bids
19. auction_winners
20. payout_calculations
21. payouts
22. agent_chit_settlements
23. ledger_entries
24. notifications
25. documents
26. disputes
27. audit_logs

The actual migrations/models are the next database implementation increment.
