# v22 Release Checklist

## Environment
- [ ] EXPO_PUBLIC_API_URL configured per environment
- [ ] EXPO_PUBLIC_SOCKET_URL configured
- [ ] Separate dev/staging/production backend
- [ ] No production secrets in source control

## Authentication
- [ ] OTP provider configured
- [ ] Native secure storage adapter selected
- [ ] Token expiry/refresh handled
- [ ] Logout revokes/invalidates token where supported

## Financial safety
- [ ] Backend remains source of truth
- [ ] Client cannot authorize creator actions
- [ ] Payments are never marked verified by UI alone
- [ ] Auction close is server authoritative
- [ ] Draw winner is server authoritative

## Mobile
- [ ] Android application ID finalized
- [ ] iOS bundle identifier finalized
- [ ] App icon/splash assets added
- [ ] Accessibility labels reviewed
- [ ] Offline cache only used for read-only views
- [ ] No financial mutation is queued blindly offline

## Store
- [ ] Privacy policy
- [ ] Terms of use
- [ ] Support contact
- [ ] Data deletion process
- [ ] Play Store/App Store metadata
- [ ] Production EAS credentials

## QA
- [ ] Unit tests
- [ ] API integration tests
- [ ] Android device test
- [ ] iOS device test
- [ ] Slow network test
- [ ] Offline test
- [ ] Auction concurrency test
- [ ] Payment duplicate test
