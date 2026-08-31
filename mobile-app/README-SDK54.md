# Chit Management Mobile — Expo SDK 54

This version is upgraded for Expo SDK 54 so it can run in the current Expo Go app on a physical iPhone.

## Requirements

- Node.js 20.19.x or newer
- Expo Go for SDK 54 from the Apple App Store
- Backend API reachable at `https://chit-management-app.onrender.com`

## Clean install

From this `mobile-app` directory:

```bash
rm -rf node_modules package-lock.json
npm install
npx expo-doctor@latest
```

## Configure API

Create `.env`:

```env
EXPO_PUBLIC_API_URL=https://chit-management-app.onrender.com
```

## Start

```bash
npx expo start -c
```

Scan the QR code with Expo Go.

## Verify SDK

```bash
npx expo --version
npx expo config --json | grep -E 'sdkVersion|name|slug'
```

The project must report Expo SDK 54.0.x. Do not use an SDK 53 Expo Go build.

## Why SDK 54

The iOS App Store Expo Go currently supports SDK 54. SDK 53 projects cannot be opened by the SDK 54 Expo Go app. This project therefore uses the SDK 54-compatible Expo/React Native/Expo Router versions.
