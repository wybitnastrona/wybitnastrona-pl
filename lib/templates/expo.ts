/**
 * Expo / React Native template (mobile mode).
 *
 * Uruchamiane w WebContainerze poprzez `npx expo start --tunnel`.
 * Tunel jest niezbedny, bo WebContainer nie ma sieci LAN — Expo Go
 * laczy sie z bundlerem przez relay.
 *
 * Stylizacja: NativeWind (Tailwind dla React Native).
 * Nawigacja: expo-router (file-based, w katalogu /app).
 */

import type { ProjectFiles } from "@/lib/types/project";

export const EXPO_DEPS: Record<string, string> = {
  expo: "~52.0.0",
  "expo-router": "~4.0.0",
  "expo-status-bar": "~2.0.0",
  "expo-constants": "~17.0.0",
  "expo-linking": "~7.0.0",
  react: "18.3.1",
  "react-native": "0.76.5",
  "react-native-safe-area-context": "4.12.0",
  "react-native-screens": "~4.4.0",
  "react-native-reanimated": "~3.16.0",
  "react-native-gesture-handler": "~2.20.0",
  nativewind: "^4.1.23",
  tailwindcss: "^3.4.0",
  "lucide-react-native": "^0.460.0",
};

export const EXPO_DEV_DEPS: Record<string, string> = {
  "@babel/core": "^7.25.0",
  "@types/react": "~18.3.12",
  typescript: "~5.3.3",
};

export const EXPO_RUN = { cmd: "npx", args: ["expo", "start", "--tunnel"] };

const PACKAGE_JSON = `{
  "name": "wybitna-mobile-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start --tunnel",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": ${JSON.stringify(EXPO_DEPS, null, 2)
    .split("\n")
    .map((l, i) => (i === 0 ? l : "  " + l))
    .join("\n")},
  "devDependencies": ${JSON.stringify(EXPO_DEV_DEPS, null, 2)
    .split("\n")
    .map((l, i) => (i === 0 ? l : "  " + l))
    .join("\n")},
  "private": true
}
`;

const APP_JSON = `{
  "expo": {
    "name": "Wybitna Mobile App",
    "slug": "wybitna-mobile-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "wybitnastrona",
    "userInterfaceStyle": "automatic",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "pl.wybitnastrona.mobile"
    },
    "android": {
      "package": "pl.wybitnastrona.mobile",
      "adaptiveIcon": {
        "backgroundColor": "#0a0a0a"
      }
    },
    "web": {
      "bundler": "metro",
      "output": "static"
    },
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
`;

const TSCONFIG = `{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "expo-env.d.ts"]
}
`;

const BABEL_CONFIG = `module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
`;

const METRO_CONFIG = `const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
`;

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        beige: "#e8dcc6",
      },
    },
  },
  plugins: [],
};
`;

const GLOBAL_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

const NATIVEWIND_ENV_D_TS = `/// <reference types="nativewind/types" />
`;

const LAYOUT_TSX = `import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import "../global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#e8dcc6",
          contentStyle: { backgroundColor: "#0a0a0a" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Witaj" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
`;

const INDEX_TSX = `import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Sparkles } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950" edges={["bottom"]}>
      <ScrollView contentContainerClassName="flex-grow items-center justify-center gap-6 px-6 py-10">
        <View className="items-center gap-2">
          <Sparkles size={36} color="#e8dcc6" />
          <Text className="text-3xl font-semibold text-beige">
            Wybitna Mobile App
          </Text>
          <Text className="text-center text-neutral-400">
            Edytuj{" "}
            <Text className="font-mono text-beige">app/index.tsx</Text>{" "}
            i opis nowy ekran.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setCount((c) => c + 1)}
          className="rounded-2xl bg-beige px-6 py-3 active:opacity-70"
        >
          <Text className="text-base font-medium text-neutral-950">
            Kliknij ({count})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
`;

const APP_D_TS = `/// <reference types="expo-router/types" />
`;

const README = `# Wybitna Mobile App

React Native + Expo + NativeWind.

## Start

\`\`\`bash
npx expo start --tunnel
\`\`\`

Zeskanuj kod QR aplikacja **Expo Go** (iOS / Android).

## Struktura

- \`app/_layout.tsx\` — root Stack
- \`app/index.tsx\` — pierwszy ekran
- \`global.css\` — Tailwind / NativeWind
- \`tailwind.config.js\` — paleta i preset NativeWind
`;

export function getExpoTemplate(): ProjectFiles {
  return {
    "/package.json": { code: PACKAGE_JSON, hidden: false },
    "/app.json": { code: APP_JSON, hidden: false },
    "/tsconfig.json": { code: TSCONFIG, hidden: true },
    "/babel.config.js": { code: BABEL_CONFIG, hidden: true },
    "/metro.config.js": { code: METRO_CONFIG, hidden: true },
    "/tailwind.config.js": { code: TAILWIND_CONFIG, hidden: false },
    "/global.css": { code: GLOBAL_CSS, hidden: true },
    "/nativewind-env.d.ts": { code: NATIVEWIND_ENV_D_TS, hidden: true },
    "/expo-env.d.ts": { code: APP_D_TS, hidden: true },
    "/app/_layout.tsx": { code: LAYOUT_TSX, hidden: false },
    "/app/index.tsx": { code: INDEX_TSX, hidden: false, active: true },
    "/README.md": { code: README, hidden: false },
  };
}
