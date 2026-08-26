# v42 Complete — Member UPI + UPI/Cash Payment Collection

Cumulative package: v1 → v42.

Added:
- Member payment profile with UPI ID/name
- Preferred payment method
- Cash accepted flag
- UPI/cash payment collection foundation
- Member self-payment endpoint
- Creator/Agent cash recording endpoint
- Verified CASH payment records for authorized collector
- Winner UPI destination snapshot service
- Mobile Payment Details screen
- Mobile Record Cash screen
- Swagger annotations
- Integration tests

Important:
The payment collection layer records transactions and authorization. A real UPI gateway/provider is still separate; a UPI payment may remain PENDING until verified/confirmed unless gateway integration is added.

Historical chit migration is next.
