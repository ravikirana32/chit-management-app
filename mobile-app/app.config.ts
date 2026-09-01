import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "Chit Management",
  slug: "chit-management",
  version: "2.0.1",
  orientation: "portrait",
  scheme: "chitmanagement",
  userInterfaceStyle: "light",
  plugins: ["expo-router"],
  android: { package: "com.ravikirana.chitmanagement" },
  ios: { bundleIdentifier: "com.ravikirana.chitmanagement" },
  newArchEnabled: true,
  extra: {
    eas: {
      projectId: "a0203735-d5d7-4919-bb6e-09976789e806",
    },
  },
};
export default config;
