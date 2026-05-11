/**
 * Rejestr template'ow projektowych (frameworki).
 *
 * Kazdy template definiuje:
 *  - id (uzywany w bazie projects.template)
 *  - label (UI)
 *  - dependencies (do package.json)
 *  - files (startowe plki)
 *  - runCommand (komenda startowa dla WebContainera)
 *  - sandpackTemplate (mapping na Sandpack template, fallback gdy WC nieaktywny)
 */

import type { ProjectFiles } from "@/lib/types/project";
import {
  getReactTsTemplate,
  REACT_TS_DEPS,
  REACT_TS_RUN,
} from "./react-ts";
import {
  getNextjsTemplate,
  NEXTJS_DEPS,
  NEXTJS_RUN,
} from "./nextjs";
import { getViteVueTemplate, VITE_VUE_DEPS, VITE_VUE_RUN } from "./vue";
import {
  getAstroTemplate,
  ASTRO_DEPS,
  ASTRO_RUN,
} from "./astro";
import {
  getSvelteTemplate,
  SVELTE_DEPS,
  SVELTE_RUN,
} from "./svelte";
import {
  getExpoTemplate,
  EXPO_DEPS,
  EXPO_DEV_DEPS,
  EXPO_RUN,
} from "./expo";
import { getIosTemplate, IOS_DEPS } from "./ios";
import { getAndroidTemplate, ANDROID_DEPS } from "./android";

export type TemplateId =
  | "react-ts"
  | "nextjs"
  | "vue"
  | "astro"
  | "svelte"
  | "remix"
  | "expo"
  | "ios"
  | "android";

export type TemplateDef = {
  id: TemplateId;
  label: string;
  description: string;
  /** Sandpack template (jezeli mozliwe — niektore frameworki tylko WC). */
  sandpackTemplate?: "react-ts" | "vue-ts" | "vanilla";
  /** Czy dziala tylko na WebContainerze (np Next.js, Astro). */
  webContainerOnly: boolean;
  /**
   * Czy template jest "code-only" — brak preview w przegladarce (iOS / Android).
   * Uzytkownik widzi tylko edytor + eksport ZIP do Xcode / Android Studio.
   */
  codeOnly?: boolean;
  /** Generuje pliki startowe. */
  getFiles: () => ProjectFiles;
  /** Zaleznosci do package.json. */
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  /** Komenda startowa dla WC. */
  runCommand?: { cmd: string; args: string[] };
  /** Czy dostepny w MVP. */
  available: boolean;
  badge?: "new" | "beta";
  /**
   * Emergent-style container image label (kosmetic — wyswietlane w Advanced Controls).
   * Faktyczny preview to nadal Sandpack / WebContainer.
   */
  containerImage: string;
};

export const TEMPLATES: TemplateDef[] = [
  {
    id: "react-ts",
    label: "React + Vite",
    description: "Klasyczna aplikacja React z TypeScript. Najszybsza w Sandpacku.",
    sandpackTemplate: "react-ts",
    webContainerOnly: false,
    getFiles: getReactTsTemplate,
    dependencies: REACT_TS_DEPS,
    runCommand: REACT_TS_RUN,
    available: true,
    containerImage: "wybitnastrona-hub/react_vite_tailwind_shadcn_base:release",
  },
  {
    id: "nextjs",
    label: "Next.js 16",
    description: "Server components + App Router. Wymaga WebContainera.",
    webContainerOnly: true,
    getFiles: getNextjsTemplate,
    dependencies: NEXTJS_DEPS,
    runCommand: NEXTJS_RUN,
    available: true,
    badge: "new",
    containerImage: "wybitnastrona-hub/nextjs_app_router_supabase_shadcn_base:release",
  },
  {
    id: "vue",
    label: "Vue 3 + Vite",
    description: "Vue 3 z Composition API.",
    sandpackTemplate: "vue-ts",
    webContainerOnly: false,
    getFiles: getViteVueTemplate,
    dependencies: VITE_VUE_DEPS,
    runCommand: VITE_VUE_RUN,
    available: true,
    containerImage: "wybitnastrona-hub/vue3_vite_tailwind_base:release",
  },
  {
    id: "astro",
    label: "Astro",
    description: "Statyczne strony z islands. Idealne do blogow i landing.",
    webContainerOnly: true,
    getFiles: getAstroTemplate,
    dependencies: ASTRO_DEPS,
    runCommand: ASTRO_RUN,
    available: true,
    containerImage: "wybitnastrona-hub/astro_tailwind_base:release",
  },
  {
    id: "svelte",
    label: "SvelteKit",
    description: "Mniej kodu, więcej radości.",
    webContainerOnly: true,
    getFiles: getSvelteTemplate,
    dependencies: SVELTE_DEPS,
    runCommand: SVELTE_RUN,
    available: true,
    badge: "beta",
    containerImage: "wybitnastrona-hub/sveltekit_tailwind_base:release",
  },
  {
    id: "remix",
    label: "Remix",
    description: "Web fundamentals + React. Wkrótce.",
    webContainerOnly: true,
    getFiles: () => ({}),
    dependencies: {},
    available: false,
    containerImage: "wybitnastrona-hub/remix_tailwind_base:release",
  },
  {
    id: "expo",
    label: "Expo / React Native",
    description: "Cross-platform mobile (React Native). Podglad przez QR + Expo Go.",
    webContainerOnly: true,
    getFiles: getExpoTemplate,
    dependencies: EXPO_DEPS,
    devDependencies: EXPO_DEV_DEPS,
    runCommand: EXPO_RUN,
    available: true,
    badge: "new",
    containerImage: "wybitnastrona-hub/expo_router_nativewind_arm:release",
  },
  {
    id: "ios",
    label: "iOS / SwiftUI",
    description: "Natywna aplikacja iOS (Swift 5.9 + SwiftUI). Eksport do Xcode 15+.",
    webContainerOnly: false,
    codeOnly: true,
    getFiles: getIosTemplate,
    dependencies: IOS_DEPS,
    available: true,
    badge: "new",
    containerImage: "wybitnastrona-hub/swift5_swiftui_xcode15:release",
  },
  {
    id: "android",
    label: "Android / Compose",
    description: "Natywna aplikacja Android (Kotlin + Jetpack Compose). Eksport do Android Studio.",
    webContainerOnly: false,
    codeOnly: true,
    getFiles: getAndroidTemplate,
    dependencies: ANDROID_DEPS,
    available: true,
    badge: "new",
    containerImage: "wybitnastrona-hub/kotlin_compose_material3:release",
  },
];

export function getTemplate(id: TemplateId | string | undefined): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export const DEFAULT_TEMPLATE: TemplateId = "react-ts";
