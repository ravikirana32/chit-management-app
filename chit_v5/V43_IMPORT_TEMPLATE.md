# Existing Chit Import Template

Import is intentionally staged as:
VALIDATE → DRAFT → REVIEW → APPLY

## Members
memberId,name,mobile,upiId,sequence

## Months
monthNumber,amount,completedAt,winnerMemberId,winnerName,monthType

## Payments
monthNumber,memberId,amount,method,reference,notes

Supported methods:
- UPI
- CASH
- BANK_TRANSFER
- OTHER

Historical records must be tagged as `HISTORICAL_IMPORT` and must never be represented as live app transactions.

The first implementation provides validation and draft/review infrastructure. Applying the imported financial rows is deliberately reserved for the reconciliation stage so the system cannot activate inconsistent historical financial data.
