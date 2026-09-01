# Final enterprise schedule-policy integration guide

Latest baseline reviewed: main @ 456565b7fd85fc021415f4378fedebf4cf396add.

This package contains the complete safe policy/operations files.

Important:
The current AuctionService and FixedDrawService already contain substantial
financial/state logic but were exposed through the repository connector in a
truncated form. They MUST be edited in the repository rather than reconstructed
from truncated output.

Required final service integration:

AuctionService constructor:
  private readonly schedulePolicy: OperationSchedulePolicyService

Before every existing schedule guard:
  this.schedulePolicy.assertScheduleAllowed(existingScheduleCheck, message)

FixedDrawService constructor:
  private readonly schedulePolicy: OperationSchedulePolicyService

Before:
  - start/open schedule gate
  - interest open/close gate
  - run draw scheduled-at gate

use:
  this.schedulePolicy.assertScheduleAllowed(existingCheck, message)

Do NOT:
  - monkey patch prototypes
  - modify scheduled_at temporarily
  - bypass authorization
  - bypass locked-month protection
  - bypass participant eligibility
  - bypass financial validation

The mobile app should consume /v1/operations/policy and operation-state
allowedActions; it must not own ALLOW_SCHEDULED_OPERATION_BYPASS.
