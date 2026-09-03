# Chit — Runtime/UI/Flow Fix Package

This package is a directly replaceable source patch. It does NOT push to GitHub/main.

## Main fixes

1. Fixed Render TypeScript inheritance error:
   - `FixedDrawService.schedulePolicy` is `protected`, not private.
   - `FixedDrawFundedLaterService` receives `OperationSchedulePolicyService` and calls `super(db, schedulePolicy)`.
   - Removed the invalid `this.config` dependency from the fixed-draw service path.
2. Central scheduled-operation bypass now applies to Auction and Fixed Draw open/close/reopen/run gates.
3. Auction finalize now accepts the path auction ID and the mobile API sends `{auctionId}`; DTO is optional so the path remains authoritative.
4. Fixed Draw eligible-member list now returns and displays member names/mobile numbers, not only INTERESTED/NO_RESPONSE.
5. Month Close, Payments, Payouts, Ledger, Notifications, Collections and Reconciliation API methods were restored to `mobile-app/src/api/all.ts`.
6. Added Notifications list/read endpoints and user-wide notification inbox support.
7. Member payment screen now clearly explains:
   - CASH: pay the responsible agent and keep the receipt/reference.
   - UPI/BANK: pay the responsible agent and enter the transaction reference.
   - Responsible agent name/mobile/UPI is shown when configured.
8. Member obligation selection no longer depends on a potentially unrelated global `user.participantId`; it uses the authenticated month's obligation returned by the API.
9. Member dashboard now labels an outstanding contribution as `Pay Contribution`; Chit Detail exposes `Pay Contribution / Payments` for the current month.
10. Chit creation flow changed to:
    - choose chit basics and total chit amount/member count,
    - automatically calculate monthly installment = total chit amount / members,
    - select AGENT_CHIT months first,
    - monthly schedule then shows automatic members/installment,
    - AGENT_CHIT payout is always the full total chit amount.
11. Agent-created chits automatically resolve the logged-in agent on the API even if no `agentId` is sent. Admin-created chits require an active responsible agent in the mobile UI.
12. AGENT_CHIT settlement can be executed by the assigned active agent with `can_run_draw` or `can_manage_chit`, as well as creator/admin.
13. AGENT_CHIT payout amount is enforced server-side to `chits.total_chit_amount`, including schedule updates.
14. Chit Start now finds the first month that is not LOCKED/COMPLETED instead of assuming Month 1 is always open.
15. Current month in Chit Detail is derived from month status, not `completed_months + 1`.
16. Added admin user search + status/role filters and delete action.
17. Added admin agent deactivate action.
18. Added pre-start member removal through the participant API while preserving history.
19. Added admin draft-chit soft delete and filtered deleted chits from normal chit list/get.
20. Removed JSX whitespace-only nodes between conditional components in the affected screens to eliminate React Native `Text strings must be rendered within a <Text> component` crashes.

## Files

See `REPLACEMENT_MANIFEST.json` for the exact replace paths.

## Verification performed here

- All TypeScript/TSX source under the modified backend/mobile trees was transpiled with TypeScript 5.8.3 successfully.
- Mobile API imports were checked against `src/api/all.ts`; no missing API exports remain.
- Render blocker patterns (`private schedulePolicy`, `super(db)`, `this.config` in fixed-draw) were checked and removed/fixed.
- This environment does not have the project's npm dependencies installed, so a real `npm run build`, Expo device run, database migration run, and Render deployment cannot be certified here.

## Test/staging bypass

Set on the API service only:

`ALLOW_SCHEDULED_OPERATION_BYPASS=true`

Then redeploy/restart the API. Verify:

`GET /v1/operations/policy`

must report:

`data.scheduleBypassEnabled = true`

The bypass only removes schedule date/time restrictions. Authentication, authorization, member eligibility, financial validation, duplicate protection and locked-month protection remain enforced.

For production set:

`ALLOW_SCHEDULED_OPERATION_BYPASS=false`
