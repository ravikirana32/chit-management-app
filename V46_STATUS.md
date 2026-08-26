# v46 Complete — Payment Proof & Disputes

Cumulative package: v1 → v46.

Added:
- Private payment proof metadata model
- Payment proof attachment API
- Payment claim transition
- Payment dispute model
- Dispute API
- Authorized verification API
- Rejection API
- Payment verification timestamps and verifier
- Private-storage design
- Payment proof/dispute integration tests
- Security/design documentation

Important:
The current API expects a storage key/metadata. Production should use private object storage with short-lived signed upload/download URLs. It must not expose payment screenshots as public files.

Next v47:
- Chit common chat
- Socket.IO real-time messages
- Message persistence
- Creator announcements/pinning
- Moderation
- Unread counts
- Attachments
- Chat settings
