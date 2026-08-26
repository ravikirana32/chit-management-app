# Render Environment Checklist

## API
- [ ] GitHub repository connected
- [ ] Root directory correct
- [ ] Node version correct
- [ ] Build command correct
- [ ] Start command correct
- [ ] Port binds to 0.0.0.0
- [ ] Health check configured
- [ ] CORS configured
- [ ] Logs clean

## Database
- [ ] Postgres created
- [ ] Same region
- [ ] Internal connection configured
- [ ] Migrations run
- [ ] Seed/test data loaded
- [ ] No production data

## Redis / Key Value
- [ ] Key Value created
- [ ] Same region
- [ ] Connection configured
- [ ] Cache/session behavior tested

## Security
- [ ] No .env committed
- [ ] Test secrets are unique
- [ ] JWT secrets are strong
- [ ] Database is not publicly exposed
- [ ] Swagger is not treated as authentication
- [ ] Payment screenshots are not stored on local filesystem

## Mobile
- [ ] HTTPS API URL configured
- [ ] Android tested
- [ ] iOS/TestFlight tested
- [ ] UPI deep link tested
- [ ] Chat tested
