# Chit App v45 — Command Cheat Sheet

## Backend
cd chit_v5
npm ci
npm run build
npm run test:release
npm run start:dev

## Mobile
cd mobile-app
npm ci
npx expo start

## Android
eas login
eas build:configure
eas build --platform android

## iOS (macOS)
eas login
eas build:configure
eas build --platform ios

## Production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api

## Local PostgreSQL
docker run --name chit-postgres -e POSTGRES_DB=chit_app -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine

## Local Redis
docker run --name chit-redis -p 6379:6379 -d redis:7-alpine
