# v47 — Chit Group Chat

## Purpose

Provide a private, chit-specific communication channel without mixing payment evidence into common chat.

## Roles

Creator:
- post
- reply
- pin
- delete/moderate
- change chat settings

Agent:
- post
- reply
- pin
- moderate/delete

Winner:
- post
- reply
- confirm operational messages

Member:
- post/reply according to creator settings
- delete own messages

## Real-time

Socket.IO namespace:
`/chat`

Events:
- `chat.join`
- `chat.joined`
- `chat.typing`

Persistent messages remain in PostgreSQL.

## Privacy

Only chit participants and the creator/authorized roles can access a chit chat.

Payment screenshots are NOT automatically posted to common chat.

## Future attachment flow

Attachments should use private object storage and short-lived signed URLs, exactly like payment proof. Do not expose public file URLs.

## Notifications

Chat can later trigger push notifications with:
- new message
- mention
- creator announcement
- pinned announcement

The notification should never expose sensitive payment proof in the push body.
