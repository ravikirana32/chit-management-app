# CHIT APP — COMPLETE BEGINNER SETUP, RUN, DEPLOY & PUBLISH GUIDE

Version: v45 Final Production Release Candidate
Scope: Backend API + PostgreSQL + Redis + NGINX + Mobile Android/iOS + staging/production deployment

> IMPORTANT
> This guide is written for a beginner who has not previously set up this project.
> Follow the steps in order.
> Do not skip the database migration, environment configuration, backup, security and staging steps.
> Production credentials, cloud accounts, Apple/Google developer accounts, payment-provider credentials and signing keys are NOT included in the ZIP.

---

# 1. PROJECT STRUCTURE

After extracting the ZIP, you should see approximately:

```text
chit_app_complete_v45/
├── chit_v5/                         # Backend API
├── mobile-app/                      # React Native / Expo mobile application
├── infra/
│   └── nginx/
├── docker-compose.prod.yml
├── .env.production.example
├── performance/
├── RELEASE_CANDIDATE_V41.md
├── V42_STATUS.md
├── V43_STATUS.md
├── V44_STATUS.md
├── V45_FINAL_RELEASE_REPORT.md
└── V45_RELEASE_CHECKLIST.md
```

---

# 2. SOFTWARE TO INSTALL BEFORE STARTING

## 2.1 Windows development machine

Recommended:

1. Git
2. Node.js 22 LTS
3. npm (comes with Node.js)
4. Docker Desktop
5. Visual Studio Code
6. PostgreSQL client tools (`psql`) — optional if PostgreSQL runs inside Docker
7. Redis CLI — optional if Redis runs inside Docker
8. Expo tooling / Android Studio for Android development
9. Xcode for iOS development — macOS only

Check:

```bash
git --version
node --version
npm --version
docker --version
docker compose version
```

Recommended Node version:

```text
Node.js 22.x
```

---

# 3. INSTALL GIT

Windows:

Download and install Git from the official Git website.

After installation:

```bash
git --version
```

You should see a Git version.

---

# 4. INSTALL NODE.JS

Install Node.js 22 LTS.

Verify:

```bash
node -v
npm -v
```

If Node reports a version other than 22.x, use a Node version manager or install Node 22 LTS.

---

# 5. INSTALL DOCKER DESKTOP

Install Docker Desktop.

Start Docker Desktop.

Verify:

```bash
docker --version
docker compose version
```

Docker will be used for:

- PostgreSQL
- Redis
- Production API
- NGINX
- Local infrastructure

---

# 6. INSTALL VS CODE

Install Visual Studio Code.

Recommended extensions:

- ESLint
- Prettier
- Docker
- GitLens
- REST Client or Thunder Client
- TypeScript support
- React Native / Expo support

---

# 7. BACKEND SETUP

Open a terminal.

Go to the extracted project:

```bash
cd chit_app_complete_v45/chit_v5
```

Install dependencies:

```bash
npm ci
```

If `npm ci` fails because the lock file does not match the package file:

```bash
npm install
```

Then use:

```bash
npm ci
```

for future clean installations.

---

# 8. BACKEND ENVIRONMENT

Create a local environment file.

Example:

```text
chit_v5/
├── .env
├── package.json
└── src/
```

Use the project's existing environment variable names.

Typical local values:

```env
NODE_ENV=development
PORT=3000

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=chit_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_LOCAL_PASSWORD

REDIS_URL=redis://localhost:6379

JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_LOCAL_SECRET
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

LOG_LEVEL=debug
```

Do NOT use production secrets for local development.

---

# 9. START POSTGRESQL AND REDIS LOCALLY

If Docker is available, the easiest approach is to start local PostgreSQL and Redis containers.

Example:

```bash
docker run --name chit-postgres \
  -e POSTGRES_DB=chit_app \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Redis:

```bash
docker run --name chit-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

Check:

```bash
docker ps
```

You should see both containers.

---

# 10. DATABASE MIGRATIONS

From:

```bash
cd chit_v5
```

Run the migration command supported by the project's Sequelize configuration.

If the project exposes a migration script:

```bash
npm run db:migrate
```

If the project uses Sequelize CLI directly:

```bash
npx sequelize-cli db:migrate
```

Check the project's `package.json` and Sequelize configuration if the exact script name differs.

NEVER run migrations against production until:

1. Backup exists.
2. Migration has been tested on staging.
3. Rollback/recovery procedure is understood.

---

# 11. SEED TEST DATA

If seed scripts exist:

```bash
npm run db:seed
```

or:

```bash
npx sequelize-cli db:seed:all
```

Use test/demo data only.

Do not seed demo users into production.

---

# 12. START BACKEND DEVELOPMENT SERVER

Run:

```bash
npm run start:dev
```

If the project uses another development script, check:

```bash
npm run
```

Look for:

```text
start
start:dev
dev
```

Expected API:

```text
http://localhost:3000
```

---

# 13. TEST THE BACKEND

Health:

```bash
curl http://localhost:3000/health
```

Windows PowerShell:

```powershell
Invoke-WebRequest http://localhost:3000/health
```

Then run:

```bash
npm test
```

Run the complete release test suite:

```bash
npm run test:release
```

Build:

```bash
npm run build
```

---

# 14. SWAGGER / API DOCUMENTATION

Start the backend.

Open the Swagger URL configured by the application.

Common examples are:

```text
http://localhost:3000/api
http://localhost:3000/docs
http://localhost:3000/swagger
```

Use the exact path configured in `src/main.ts`.

Test:

- Authentication
- Chits
- Members
- Payments
- Cash collection
- Auctions
- Draws
- Payouts
- Notifications
- Existing chit import
- Reconciliation

---

# 15. IMPORTANT PAYMENT TEST

Before production, test this complete scenario:

```text
Member A
  ↓
Monthly obligation ₹10,000
  ↓
Member pays UPI
  ↓
Payment recorded
  ↓
Verification
  ↓
Ledger
```

Then:

```text
Member B
  ↓
Monthly obligation ₹10,000
  ↓
Gives cash to Creator
  ↓
Creator selects Member B
  ↓
Mark as Paid — Cash
  ↓
Verified
  ↓
Ledger
```

Then test:

```text
Member C
  ↓
Cash
  ↓
Agent receives cash
  ↓
Agent records payment
```

Verify that the member, amount, month and collector are correct.

---

# 16. EXISTING CHIT MIGRATION TEST

Create a staging/test chit that already has 4 completed months.

Import:

- Members
- Previous winners
- Monthly amounts
- Cash payments
- UPI payments
- Previous month details

Follow:

```text
VALIDATE
↓
DRAFT
↓
REVIEW
↓
RECONCILE
↓
RESOLVE DIFFERENCES
↓
APPLY
↓
ACTIVATE
```

Never skip reconciliation.

---

# 17. MOBILE APP SETUP

Open another terminal.

Go to:

```bash
cd chit_app_complete_v45/mobile-app
```

Install:

```bash
npm ci
```

If necessary:

```bash
npm install
```

---

# 18. EXPO / MOBILE DEVELOPMENT

Check whether the project uses Expo:

```bash
npx expo --version
```

Start:

```bash
npx expo start
```

The terminal will show options for:

```text
Android
iOS
Web
Expo Go
```

---

# 19. CONFIGURE MOBILE API URL

The mobile application must know where the backend is running.

For a physical phone, DO NOT use:

```text
localhost
```

because `localhost` means the phone itself.

Use the development computer's LAN IP.

Example:

```text
http://192.168.1.20:3000
```

The computer and phone must be on the same Wi-Fi network.

For Android emulator, commonly:

```text
http://10.0.2.2:3000
```

For iOS simulator:

```text
http://localhost:3000
```

Use the environment/configuration mechanism already present in the mobile project.

---

# 20. RUN ANDROID DEVELOPMENT

Install Android Studio.

Install:

- Android SDK
- Android SDK Platform
- Android Emulator
- Android SDK Build Tools
- Android SDK Platform Tools

Create an emulator.

Start the emulator.

Then:

```bash
npx expo start
```

or, if the project is configured for native builds:

```bash
npx expo run:android
```

---

# 21. RUN IOS DEVELOPMENT

iOS native builds require macOS and Xcode.

Install:

- Xcode
- Xcode Command Line Tools
- CocoaPods if required
- Apple Developer account for device distribution

Then:

```bash
npx expo start
```

or:

```bash
npx expo run:ios
```

A Windows PC cannot perform the final native iOS build locally. Use a Mac or an appropriate cloud build service.

---

# 22. MOBILE FEATURES TO TEST

Test both roles.

Creator:

```text
Login
↓
Dashboard
↓
My Chits
↓
Members
↓
Monthly schedule
↓
Payments
↓
Cash collection
↓
Draw / Auction
↓
Winner
↓
Payout
↓
Reconciliation
```

Member:

```text
Login
↓
Dashboard
↓
My Chits
↓
Obligation
↓
UPI / Cash
↓
Payment status
↓
Winner information
↓
Statement
```

Also test:

- Notifications
- Offline state
- Error state
- Loading state
- Pull-to-refresh
- UPI profile
- Existing chit import
- Accessibility

---

# 23. PRODUCTION BACKEND ARCHITECTURE

Production:

```text
                         INTERNET
                             │
                           HTTPS
                             │
                           NGINX
                             │
                           API
                        /        \
                       /          \
                 PostgreSQL      Redis
                       │
                    Backups
```

The project includes:

```text
docker-compose.prod.yml
infra/nginx/nginx.conf
chit_v5/Dockerfile
.env.production.example
```

---

# 24. PRODUCTION SERVER REQUIREMENTS

Recommended starting server:

- Linux Ubuntu LTS
- 2–4 CPU
- 4–8 GB RAM for initial deployment
- SSD storage
- Public IP
- Domain name
- Firewall
- HTTPS certificate

For a serious production deployment, use managed PostgreSQL and managed Redis where practical.

---

# 25. CREATE PRODUCTION SERVER

Create a Linux server through your chosen cloud provider.

Connect:

```bash
ssh user@YOUR_SERVER_IP
```

Update:

```bash
sudo apt update
sudo apt upgrade -y
```

Install Docker using the official Docker installation procedure.

Verify:

```bash
docker --version
docker compose version
```

---

# 26. DEPLOY SOURCE

Recommended:

```bash
git clone YOUR_PRIVATE_REPOSITORY_URL
cd YOUR_PROJECT
```

OR securely copy the release package to the server.

Do not expose private source repositories publicly.

---

# 27. PRODUCTION ENVIRONMENT

Copy:

```text
.env.production.example
```

to:

```text
.env.production
```

Fill in real production values.

Example:

```env
NODE_ENV=production
POSTGRES_DB=chit
POSTGRES_USER=chit_app
POSTGRES_PASSWORD=VERY_LONG_RANDOM_SECRET

REDIS_URL=redis://redis:6379

JWT_SECRET=VERY_LONG_RANDOM_SECRET
```

Never commit `.env.production`.

---

# 28. TLS / HTTPS

Configure:

```text
https://api.yourdomain.com
```

Use a trusted TLS certificate.

NGINX terminates HTTPS and forwards traffic to the API.

Do not run a production financial application over plain HTTP.

---

# 29. PRODUCTION DATABASE

Before migration:

1. Create database.
2. Create application user.
3. Restrict access.
4. Enable backups.
5. Test restore.
6. Run migrations on staging first.

Then:

```bash
npm run db:migrate
```

or the project's configured Sequelize migration command.

---

# 30. START PRODUCTION

From project root:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Check:

```bash
docker compose -f docker-compose.prod.yml ps
```

Logs:

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

NGINX:

```bash
docker compose -f docker-compose.prod.yml logs -f nginx
```

---

# 31. PRODUCTION HEALTH CHECK

Open:

```text
https://api.yourdomain.com/health
```

Verify:

- API alive
- PostgreSQL connected
- Redis connected
- readiness healthy

Do not announce production readiness until this works.

---

# 32. BACKUPS

The project includes:

```text
infra/backup/backup-postgres.sh
```

Configure automated backups.

Minimum recommendation:

```text
Daily full backup
+
Retention
+
Off-server copy
+
Periodic restore test
```

A backup that has never been restored/tested should not be considered reliable.

---

# 33. CI/CD

The project includes:

```text
.github/workflows/ci.yml
```

Push code:

```bash
git add .
git commit -m "release"
git push
```

CI should run:

- npm ci
- build
- tests
- schema tests

For production deployment, use a controlled deployment pipeline rather than automatically deploying every commit.

---

# 34. ANDROID RELEASE PREPARATION

You need:

- Google Play Console developer account
- Android package/application ID
- App icon
- Splash screen
- Privacy policy URL
- Terms URL if required
- Production API URL
- Signing configuration
- FCM configuration if push notifications are enabled

Never lose the Android signing key.

---

# 35. ANDROID BUILD

If Expo/EAS is configured:

Install:

```bash
npm install -g eas-cli
```

Login:

```bash
eas login
```

Configure:

```bash
eas build:configure
```

Build Android:

```bash
eas build --platform android
```

For Play Store release, create the production Android App Bundle.

Typical output:

```text
.aab
```

Do not use an APK as the preferred Play Store production artifact when an AAB is required.

---

# 36. GOOGLE PLAY CONSOLE

1. Create application.
2. Set application name.
3. Set package/application ID.
4. Complete store listing.
5. Upload screenshots.
6. Upload icon.
7. Add privacy policy.
8. Complete content declarations.
9. Complete data safety information.
10. Configure countries/regions.
11. Create internal testing release.
12. Upload AAB.
13. Install and test.
14. Move to closed testing if required.
15. Fix issues.
16. Submit production release.

Recommended rollout:

```text
Internal testing
      ↓
Closed testing
      ↓
Production
      ↓
Staged rollout
      ↓
100%
```

---

# 37. IOS RELEASE PREPARATION

You need:

- macOS
- Xcode
- Apple Developer Program
- Bundle identifier
- App Store Connect application
- Signing certificates/profiles or managed EAS credentials
- App icon
- Screenshots
- Privacy policy
- Production API
- Push notification configuration

Configure iOS:

```bash
eas build:configure
```

Build:

```bash
eas build --platform ios
```

---

# 38. APP STORE CONNECT

1. Sign in.
2. Create the application.
3. Select bundle identifier.
4. Enter app name.
5. Add description.
6. Add screenshots.
7. Add privacy policy.
8. Complete age rating.
9. Complete privacy/data collection information.
10. Upload the iOS build.
11. Test through TestFlight.
12. Fix issues.
13. Submit for review.
14. Release after approval.

Recommended:

```text
Development
   ↓
TestFlight
   ↓
Internal testing
   ↓
External testing
   ↓
App Review
   ↓
Production
```

---

# 39. PUSH NOTIFICATIONS

Configure:

Android:

```text
Firebase Cloud Messaging
```

iOS:

```text
Apple Push Notification service
```

Configure credentials only through secure secret management.

Test:

- Payment reminder
- Auction alert
- Winner alert
- Payout notification
- Overdue notification
- Member update

---

# 40. UPI / PAYMENT PROVIDER

Important:

The application supports recording UPI payments and payment references.

If you want automated payment verification, integrate an appropriate regulated payment provider/UPI collection service.

Do not treat:

```text
"Pay UPI"
```

as proof of successful payment by itself.

The safe flow is:

```text
Payment initiated
      ↓
Provider/reference
      ↓
Verification
      ↓
Payment VERIFIED
      ↓
Ledger
```

For manual UPI:

```text
Member pays winner
      ↓
Transaction reference
      ↓
Verification
      ↓
Ledger
```

---

# 41. SECURITY RULES

Never:

- Commit passwords
- Commit JWT secrets
- Commit cloud credentials
- Commit FCM private keys
- Commit APNs private keys
- Commit payment-provider secrets
- Share database passwords in screenshots
- Use production data in development
- Skip backups
- Allow normal members to mark another member's payment as paid

Always:

- Use HTTPS
- Use strong secrets
- Restrict database access
- Enable backups
- Monitor logs
- Test authorization
- Test duplicate payments
- Test reconciliation
- Keep audit records

---

# 42. FIRST PRODUCTION SMOKE TEST

After deployment:

1. Open health endpoint.
2. Create test creator.
3. Create test chit.
4. Add test members.
5. Add UPI details.
6. Create monthly obligations.
7. Test UPI payment.
8. Test cash payment.
9. Creator marks cash paid.
10. Agent marks cash paid.
11. Verify ledger.
12. Run test draw/auction.
13. Verify winner.
14. Verify payout.
15. Verify notification.
16. Run reconciliation.
17. Test backup.
18. Test restore procedure.

Only after this should real financial users be onboarded.

---

# 43. EXISTING CHIT PRODUCTION MIGRATION

For a real existing chit:

1. Take database backup.
2. Create staging copy.
3. Import members.
4. Import previous months.
5. Import winners.
6. Import payments.
7. Validate.
8. Reconcile every historical month.
9. Resolve differences.
10. Creator reviews.
11. Apply.
12. Activate.
13. Verify current month.
14. Start live collection.
15. Monitor first live month closely.

Never migrate directly into production without a staging rehearsal.

---

# 44. ROLLBACK

If a deployment fails:

```text
Stop traffic
   ↓
Preserve logs
   ↓
Identify migration/version
   ↓
Restore or rollback according to tested procedure
   ↓
Verify database
   ↓
Verify ledger
   ↓
Verify payment records
   ↓
Resume traffic
```

Do not manually edit financial records directly in PostgreSQL unless performing a controlled, audited recovery.

---

# 45. RELEASE COMMAND SUMMARY

## Backend

```bash
cd chit_v5
npm ci
npm run build
npm run test:release
npm run start:dev
```

## Mobile

```bash
cd mobile-app
npm ci
npx expo start
```

## Android

```bash
eas build --platform android
```

## iOS

```bash
eas build --platform ios
```

## Production

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Production logs

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

## Production status

```bash
docker compose -f docker-compose.prod.yml ps
```

---

# 46. TROUBLESHOOTING

## API cannot connect to database

Check:

```bash
docker ps
```

Check PostgreSQL:

```bash
docker logs chit-postgres
```

Check environment:

```text
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
```

---

## Mobile cannot connect to API

Do not use `localhost` on a physical phone.

Use:

```text
http://YOUR_COMPUTER_LAN_IP:3000
```

Check:

- Phone and computer are on same Wi-Fi.
- Windows firewall allows the port.
- API is listening on the appropriate interface.
- API health endpoint works from the phone.

---

## Docker API starts but exits

Run:

```bash
docker compose -f docker-compose.prod.yml logs api
```

Look for:

- Missing environment variable
- Database connection
- Migration failure
- Node startup error

---

## Migration fails

DO NOT repeatedly rerun unknown migrations against production.

First:

1. Read error.
2. Backup database.
3. Reproduce on staging.
4. Fix migration.
5. Test forward migration.
6. Test recovery.
7. Apply production change during a controlled window.

---

# 47. BEGINNER RECOMMENDED ORDER

If you are completely new, follow exactly this order:

```text
1. Install Git
2. Install Node 22
3. Install Docker Desktop
4. Install VS Code
5. Extract project
6. Start PostgreSQL
7. Start Redis
8. Configure backend .env
9. npm ci
10. Run migrations
11. Start API
12. Test health
13. Test Swagger
14. Install Android Studio
15. Configure mobile API URL
16. Start Expo
17. Test Android
18. Test Creator
19. Test Member
20. Test UPI
21. Test Cash
22. Test Draw/Auction
23. Test Existing Chit migration
24. Run complete test suite
25. Deploy staging
26. Test staging
27. Configure production
28. Backup database
29. Deploy production API
30. Test production
31. Configure Android signing
32. Build Android AAB
33. Test Play internal release
34. Configure Apple signing
35. Build iOS
36. Test TestFlight
37. Submit Android
38. Submit iOS
39. Monitor production
```

---

# 48. FINAL GOLDEN RULE

The financial system should always follow:

```text
ACTION
  ↓
AUTHORIZATION
  ↓
TRANSACTION
  ↓
VERIFICATION
  ↓
LEDGER
  ↓
RECONCILIATION
```

Never solve financial problems by simply changing a status field.

For cash:

```text
Cash received
  ↓
Authorized Creator/Agent
  ↓
Payment record
  ↓
Verified
  ↓
Ledger
```

For historical data:

```text
External historical record
  ↓
Import
  ↓
Validation
  ↓
Reconciliation
  ↓
Creator approval
  ↓
Live operation
```

This preserves the audit trail and makes the application safer for real chit operations.

---

# 49. OFFICIAL RELEASE DOCUMENTS IN THIS ZIP

Use these in order:

1. `BEGINNER_SETUP_DEPLOYMENT_GUIDE.md` — this document
2. `V45_RELEASE_CHECKLIST.md`
3. `V45_FINAL_RELEASE_REPORT.md`
4. `V44_MIGRATION_RECONCILIATION.md`
5. `V43_IMPORT_TEMPLATE.md`
6. `RELEASE_CANDIDATE_V41.md`

The earlier V1–V40 status documents remain in the ZIP for historical reference.

END
