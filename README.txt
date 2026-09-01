V56 ENTERPRISE HARDENING PACKAGE
Baseline: current main tree (2026-09-01)

This package contains the new hardening files only. It does not overwrite the
existing financial services. Schedule-bypass is implemented as a compatibility
policy shim so the existing financial state machine is preserved.

Production default:
ALLOW_SCHEDULED_OPERATION_BYPASS=false

Test/staging:
ALLOW_SCHEDULED_OPERATION_BYPASS=true

The bypass only removes date/time gates for Auction/Fixed Draw operations; it
never bypasses authentication, role/capability, chit/month type, eligibility,
financial, duplicate, or locked-month validations.

Authentication hardening adds server-side OTP challenges and refresh-token
rotation/revocation. A real OTP provider is still required for production
message delivery.
