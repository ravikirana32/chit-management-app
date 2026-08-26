# v46 Payment Proof & Dispute Design

## Flow

Member pays directly to winner UPI or pays cash.

UPI:
Pay → return to app → optionally upload screenshot + UPI reference → CLAIMED/PENDING → creator/agent/winner verifies.

Cash:
I Paid Cash → CLAIMED/PENDING → creator/agent/winner verifies.

## Security

Payment screenshots must be private object-storage files. The database stores metadata/storage key, not public image URLs.

Recommended production flow:
1. API authorizes upload.
2. API creates short-lived upload URL.
3. Mobile uploads directly to private object storage.
4. API records proof metadata.
5. Viewer requests a short-lived signed download URL after authorization.

## Disputes

CLAIMED/PENDING → VERIFIED
CLAIMED/PENDING → REJECTED
CLAIMED/PENDING → DISPUTED

Disputed payments must not be silently counted as settled.

## Important

A screenshot is evidence, not proof of settlement by itself. Recipient confirmation remains authoritative for manual settlement.
