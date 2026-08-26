# Environment Matrix

| Environment | API | Socket | DB | Financial E2E |
|---|---|---|---|---|
| development | local | local | local | No |
| staging | staging API | staging socket | isolated staging DB | Yes |
| production | production API | production socket | production DB | NEVER |

Rules:
- Never place secrets in Expo public environment variables.
- EXPO_PUBLIC_* values are client-visible.
- Payment provider secrets remain backend-only.
- Database credentials remain backend-only.
