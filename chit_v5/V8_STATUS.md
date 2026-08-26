# v8 Complete

Cumulative ZIP: v1-v7 plus v8.

Added:
- Scheduled auction auto-close worker
- 1-minute scheduler
- Expired auction state transition
- Month transition to AUCTION_CLOSED
- Audit event for automatic close
- Notification persistence
- Notification list/read APIs
- User notification WebSocket room support
- ScheduleModule integration

Important:
Auto-close stops bidding after the configured window. It does not silently select a winner. Creator finalization remains the explicit settlement action, preserving auditability.

Next:
- push notification provider abstraction
- payment reminders
- auction start/close notifications
- overdue/default workflows
- automated finalization policy if desired
- automated tests
