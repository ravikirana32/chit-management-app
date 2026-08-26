# v49 — Staging Hardening

## Added

- Cursor-style chat pagination
- Client message idempotency
- Presence heartbeat foundation
- Push token registration foundation
- Socket.IO join/leave/typing lifecycle
- Integration tests

## Staging acceptance

### Chat
- Send message from two devices.
- Disconnect one device and reconnect.
- Verify message history.
- Verify pagination.
- Retry the same client message ID and confirm no duplicate.
- Test creator moderation.
- Test member permissions.

### Payment proof
- Upload private proof.
- Verify only authorized roles can access it.
- Submit dispute.
- Verify dispute state prevents accidental settlement.

### Notifications
- Register Android token.
- Register iOS token.
- Send a test notification through the configured provider.
- Verify unread notification.
- Mark read.
- Verify no sensitive payment data appears in push body.

### Financial
- Run UPI claim.
- Run cash claim.
- Verify.
- Reject.
- Dispute.
- Run month reconciliation.

### Reliability
- Restart API.
- Restart Redis.
- Restart mobile/network.
- Verify recovery.
- Run database backup.
- Restore into a separate database.
- Run release test suite.

## Production gate

v49 is a hardening implementation, not a claim that a real production environment has been certified. Actual staging execution is required.
