# v50 Production Test Matrix

| ID | Scenario | Expected |
|---|---|---|
| FIN-01 | Member pays winner via UPI | Claim created, not auto-verified |
| FIN-02 | Member uploads proof | Proof private and attached to payment |
| FIN-03 | Winner verifies | Payment VERIFIED |
| FIN-04 | Creator verifies cash | Payment VERIFIED |
| FIN-05 | Agent verifies assigned cash | Payment VERIFIED |
| FIN-06 | Duplicate payment retry | No duplicate financial transaction |
| FIN-07 | Payment dispute | DISPUTED and excluded from settled total |
| FIN-08 | Historical import | Historical source retained |
| FIN-09 | Historical mismatch | Reconciliation blocks apply until resolved |
| FIN-10 | Chit activation | Current month becomes live |
| CHAT-01 | Two users chat | Both receive message |
| CHAT-02 | Network interruption | Client reconnects and loads history |
| CHAT-03 | Retry message | No duplicate with same client ID |
| CHAT-04 | Member moderation | Permission enforced |
| CHAT-05 | Message report | Report stored |
| NOTIF-01 | Register Android token | Token stored |
| NOTIF-02 | Register iOS token | Token stored |
| NOTIF-03 | Notification read | read_at populated |
| OPS-01 | API restart | Service recovers |
| OPS-02 | Redis restart | Service recovers according to retry policy |
| OPS-03 | DB backup | Backup created |
| OPS-04 | DB restore | Restored DB usable |
| MOB-01 | Android physical device | Login and API work |
| MOB-02 | iOS TestFlight | Login and API work |
| SEC-01 | Member accesses another chit | Rejected |
| SEC-02 | Member accesses another payment proof | Rejected |
| SEC-03 | Unauthorized payment verification | Rejected |
| SEC-04 | Creator accesses unrelated chit | Rejected |

A release requires all applicable tests to PASS.
