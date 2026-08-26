# v11 Complete — Overdue, Default & Reminders

Cumulative ZIP contains v1-v10 plus v11.

Added:
- Daily overdue status worker
- 7-day default grace rule
- Creator overdue/default list API
- Daily payment reminder worker
- Duplicate same-day reminder protection
- Notification-based reminder records

Lifecycle:
DUE/PENDING → PARTIAL → OVERDUE → DEFAULTED

Important:
The 7-day grace period is a product default and should be configurable per chit before production. No participant is automatically removed from a chit because of default.

Next:
- Configurable grace periods
- Recovery/payment-plan workflow
- Member dashboard APIs
- Creator dashboard APIs
- Final backend hardening/tests
- Mobile application
