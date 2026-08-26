# v48 — Chat Completion Foundation

Added:
- Message mention storage foundation
- Attachment count metadata
- Message reporting/moderation model
- Notification event model
- Notification read endpoint
- Chat notification retrieval endpoint
- Chat report endpoint
- Integration tests

Mobile UI should consume these APIs using the existing API client and Socket.IO layer.

Recommended production behavior:
- Paginate chat history.
- Reconnect Socket.IO after network loss.
- Do not expose payment proof through chat.
- Use private object storage for chat attachments.
- Send push notifications through FCM/APNs only after user/device authorization.
- Never put payment screenshots, UPI IDs or sensitive financial details into notification body text.
