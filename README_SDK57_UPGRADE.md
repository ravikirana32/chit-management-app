# CHIT — Expo SDK 57 Upgrade (Changed Files Only)

## What changed

`mobile-app/package.json` is upgraded from Expo SDK 54 to SDK 57.

SDK 57 uses:
- Expo `~57.0.17`
- React Native `0.86.3`
- React `19.2.3`
- Expo Router `~57.0.18`
- expo-constants `~57.0.17`
- expo-linking `~57.0.9`
- react-native-safe-area-context `~5.7.0`
- react-native-screens `~4.26.0`
- Node >= 22.13.0

The SDK 57 release notes recommend upgrading dependencies with Expo's installer/fixer.
The package-lock is intentionally NOT included because the existing lock is SDK 54;
it must be regenerated on the developer machine after the package.json change.

## Apply

Replace:
`mobile-app/package.json`

Then run from `mobile-app`:

```bash
rm -rf node_modules
npm install
npx expo install --fix
npx expo-doctor
```

If `expo install --fix` proposes additional SDK-57-compatible versions, accept them.

Then:

```bash
npx expo start -c
```

Your installed Expo Go is SDK 57, so it should now accept the project.

## If the project has generated ios/android directories

This project currently uses Expo config/CNG-style configuration. If your local
working tree contains generated `ios/` or `android/` directories from the old
SDK, follow the SDK 56→57 native upgrade guidance before building a native app.
For Expo Go testing, the JavaScript project itself can be started after dependency
alignment.

## Important

Do not run `npm ci` immediately with the old package-lock. Regenerate the lock first
using `npm install` / `npx expo install --fix`, then commit the resulting
`package-lock.json`.

## Source

Expo SDK 57 targets React Native 0.86 and React 19.2. SDK 57.0.17 includes the
React Native 0.86.3 fixes. See the official SDK 57 release notes and upgrade guide.
