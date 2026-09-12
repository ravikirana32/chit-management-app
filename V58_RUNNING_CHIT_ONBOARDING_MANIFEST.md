# V58 — Running Chit Onboarding (Traditional/External → App Takeover)

## Purpose

This replacement changes the Running Chit onboarding flow to match the clarified business requirement:

- The chit is **created in the app now**, even though it started outside the app.
- The app generates the **complete monthly schedule** from the original start date.
- The operator specifies how many months were already completed outside the app.
- Each completed month is entered as a **historical snapshot** by the creator/agent/operator.
- Historical entry does **not** run member payment submission/confirmation, auction, fixed draw, payout approval/confirmation, or notifications.
- The operator validates, finalizes, and **locks each historical month individually**.
- The next uncompleted month becomes the **takeover/live month**.
- From the takeover month onward, the existing normal LIVE chit workflows are used.

## Files to replace/add

1. `chit_v5/migrations/058-running-chit-cutover.js` — NEW migration
2. `chit_v5/src/modules/running-chit-onboarding/running-chit-onboarding.module.ts` — NEW module/controller
3. `chit_v5/src/app.module.ts` — REPLACE; imports both existing `ChitImportModule` and new `RunningChitOnboardingModule`
4. `mobile-app/src/api/all.ts` — REPLACE; preserves existing exports and adds `runningChitApi`
5. `mobile-app/app/existing-chit.tsx` — REPLACE; guided create → historical month finalize/lock → takeover activation UI

## API

### Create running chit
`POST /v1/running-chit-onboarding`

Creates the Chit record, participants, optional responsible-agent assignment, and all monthly schedule rows.

Important field:
- `historicalMonthCount`: number of months already completed outside the app.

Example: total 20 months, historicalMonthCount 4 → Month 5 is takeover/live.

### Finalize one historical month
`POST /v1/running-chit-onboarding/:chitId/months/:monthNumber/finalize`

The endpoint:
- validates savings continuity and available funds
- validates payment rows against collected amount
- validates payout components against payout amount
- records historical payments as VERIFIED records
- records historical payout as SETTLED when supplied
- stores the historical snapshot in `chit_months.historical_data`
- marks the month `data_origin=HISTORICAL`
- marks the month `status=LOCKED`
- records `locked_at` and `locked_by`
- updates the chit accumulated savings and completed month count

It deliberately does not execute the normal live draw/auction/payout/payment-confirmation workflows.

### Activate takeover month
`POST /v1/running-chit-onboarding/:chitId/activate/:monthNumber`

Activation is allowed only for `historical_month_count + 1` after all configured historical months are finalized. That month is marked `ACTIVE`, the chit becomes `ACTIVE`, and normal application operations can continue.

## Migration

V58 adds to `chits`:
- `onboarding_mode` (default `NEW`)
- `historical_month_count` (default `0`)

These are additive and preserve existing chit data.

V55/V57 migrations are still required before V58.

## UI behavior

The old flow asked for an existing Chit ID. V58 removes that assumption.

The new flow is:

1. Create running chit
2. Enter original start date, total duration, total amount, completed-month count, members, and optional agent
3. Generate full schedule
4. Enter Month 1 history
5. Validate + Finalize + Lock Month 1
6. Continue month-by-month until the configured historical month count
7. Activate the next month as LIVE
8. Navigate to the existing Chit Detail flow

## Validation rules

- Historical month count must be between 1 and total months - 1.
- Historical months must be finalized sequentially.
- Month 1 opening savings must be zero.
- Later opening savings must equal the previous finalized closing savings.
- Collected amount cannot exceed scheduled contribution total.
- Payment rows must equal collected amount.
- Closing savings must equal opening + collected - payout.
- Payout cannot exceed available historical funds.
- Payout components must equal payout amount when components are supplied.
- Winner, when supplied, must match an existing chit member (UUID or mobile).
- Historical months are immutable after finalization through this workflow.

## Compatibility / regression intent

- Existing `ChitsModule`, live payments, auctions, draws, payouts, month-close, reconciliation, and other business modules are not replaced.
- Existing `ChitImportModule` remains available and is explicitly imported by `AppModule` (the previous app module did not import it).
- The new endpoints are additive and isolated under `/v1/running-chit-onboarding`.

## Verification performed

Source-level TypeScript transpilation was run for:
- running-chit-onboarding module
- app.module.ts
- existing-chit.tsx
- mobile-app/src/api/all.ts

All transpiled successfully.

Not certified here: real Postgres migration execution, API integration tests, Expo SDK/device build, Render deployment, or full end-to-end financial flow.
