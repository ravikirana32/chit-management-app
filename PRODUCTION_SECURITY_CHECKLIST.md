# Production Security Checklist

## Authentication
- [ ] Strong password policy
- [ ] Short-lived access tokens
- [ ] Refresh-token protection
- [ ] Token revocation/logout
- [ ] Rate limiting
- [ ] Brute-force protection

## Authorization
- [ ] Creator can access only owned chits
- [ ] Agent can access only assigned operations
- [ ] Member can access only own membership
- [ ] Winner can access only relevant winner/payment information
- [ ] Payment proof authorization checked
- [ ] Chat authorization checked
- [ ] Admin actions audited

## Files
- [ ] Private object storage
- [ ] No public payment-proof URLs
- [ ] MIME validation
- [ ] File-size limit
- [ ] Random storage keys
- [ ] Malware scanning where available
- [ ] Short-lived signed URLs

## Financial integrity
- [ ] Idempotency
- [ ] Database transactions
- [ ] Audit trail
- [ ] Duplicate prevention
- [ ] Reconciliation
- [ ] Dispute states
- [ ] No client-controlled verification

## Infrastructure
- [ ] HTTPS only
- [ ] Database not publicly exposed
- [ ] Redis not publicly exposed
- [ ] Firewall
- [ ] Secret management
- [ ] Backup encryption
- [ ] Monitoring
