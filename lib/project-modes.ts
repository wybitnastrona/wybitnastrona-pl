/**
 * Tryby projektow — Rork.com style.
 * Kazdy tryb to platforma docelowa: iOS (Swift), Android (Kotlin), Web (React).
 *
 * iOS / Android sa code-only (brak preview w przegladarce — eksport ZIP do Xcode/Android Studio).
 * Web nadal uzywa Sandpack / WebContainer.
 */

import type { TemplateId } from "@/lib/templates";

export type ProjectMode =
  | "ios"
  | "android"
  | "web"
  | "watchos"
  | "tvos"
  | "visionos";

export type ProjectModeDef = {
  id: ProjectMode;
  label: string;
  /** Lucide icon name (uzywany w PlatformSelector). */
  icon: "apple" | "android" | "globe" | "watch" | "tv" | "vision";
  placeholder: string;
  defaultTemplate: TemplateId;
  suggestions: { label: string; prompt: string }[];
  /** Krotki opis stacku — pokazywany w dropdownie. */
  stackHint: string;
  /** Minimalny tier ktory ma dostep do tego trybu (free/pro/wybitny). */
  requiresTier: "free" | "pro" | "wybitny";
  /** Jesli true — zakładka pokazana, ale zablokowana (overlay "Wkrotce"). */
  comingSoon?: boolean;
};

export const PROJECT_MODES: ProjectModeDef[] = [
  {
    id: "web",
    label: "Strona internetowa",
    icon: "globe",
    stackHint: "Vite + React + Tailwind",
    placeholder: "Opisz strone lub aplikacje webowa...",
    defaultTemplate: "react-ts",
    requiresTier: "free",
    suggestions: [
      { label: "Landing dla trenera", prompt: "Landing page dla trenera personalnego z hero, oferta, opiniami i formularzem" },
      { label: "Portfolio fotografa", prompt: "Portfolio fotografa z galeria zdjec i formularzem kontaktowym" },
      { label: "Strona restauracji", prompt: "Strona restauracji z menu, galeria, rezerwacja stolika i mapa dojazdu" },
      { label: "Sklep internetowy", prompt: "Sklep internetowy z katalogiem produktow, koszykiem i checkoutem" },
    ],
  },
  {
    id: "android",
    label: "Aplikacja Android",
    icon: "android",
    stackHint: "Natywny Android z Kotlin + Jetpack Compose",
    placeholder: "Opisz aplikacje Android, ktora chcesz zbudowac...",
    defaultTemplate: "android",
    requiresTier: "pro",
    suggestions: [
      { label: "Menedzer zadan", prompt: "Aplikacja Android do zarzadzania zadaniami z Material 3, kategoriami i powiadomieniami" },
      { label: "Czytnik RSS", prompt: "Aplikacja Android czytnik RSS z trybem offline i ciemnym motywem" },
      { label: "Notepad z OCR", prompt: "Aplikacja Android do notatek z OCR z kamery (CameraX + ML Kit)" },
      { label: "Tracker wydatkow", prompt: "Aplikacja Android do trackowania wydatkow z wykresami i eksportem CSV" },
    ],
  },
  {
    id: "ios",
    label: "Aplikacja iOS",
    icon: "apple",
    stackHint: "iPad, Apple Watch i wiecej z SwiftUI",
    placeholder: "Opisz aplikacje iOS, ktora chcesz zbudowac...",
    defaultTemplate: "ios",
    requiresTier: "pro",
    suggestions: [
      { label: "Trener fitness", prompt: "Aplikacja iOS dla trenera fitness z trackingiem trenningow, statystykami i wykresami" },
      { label: "Lista zakupow", prompt: "Aplikacja iOS do listy zakupow z kategoriami, podzialem na sklepy i synchronizacja iCloud" },
      { label: "Pomodoro Timer", prompt: "Aplikacja iOS Pomodoro z timerem, statystyka focusu i HealthKit" },
      { label: "Habit Tracker", prompt: "Aplikacja iOS do sledzenia nawykow z streak'ami i widgetami WidgetKit" },
    ],
  },
  {
    id: "watchos",
    label: "Apple Watch",
    icon: "watch",
    stackHint: "WatchKit + SwiftUI 10+, Complications, HealthKit",
    placeholder: "Opisz aplikacje na Apple Watch...",
    defaultTemplate: "watchos",
    requiresTier: "wybitny",
    suggestions: [
      { label: "Tracker bicia serca", prompt: "Aplikacja Apple Watch monitorujaca tetno z HealthKit i Live Activity" },
      { label: "Trening interwalowy", prompt: "Aplikacja na Apple Watch do treningu interwalowego z haptic feedback i SwiftCharts" },
      { label: "Kompas pogody", prompt: "Watch app pokazujacy pogode i kompas w Complication" },
      { label: "Timer pomodoro", prompt: "Watch app Pomodoro z digital crown i custom complications" },
    ],
  },
  {
    id: "tvos",
    label: "Apple TV",
    icon: "tv",
    stackHint: "tvOS 17+ SwiftUI z focus engine",
    placeholder: "Opisz aplikacje na Apple TV...",
    defaultTemplate: "tvos",
    requiresTier: "wybitny",
    suggestions: [
      { label: "Galeria zdjec", prompt: "Aplikacja TV do przegladania zdjec z iCloud z focus engine i kategorii" },
      { label: "Karaoke", prompt: "Aplikacja Karaoke na Apple TV z biblioteka piosenek i lyrics overlay" },
      { label: "Kuchnia online", prompt: "Aplikacja TV z przepisami kulinarnymi krok-po-kroku z videoplayer" },
      { label: "Medytacja", prompt: "Aplikacja na Apple TV do medytacji z ambient backgrounds i sesjami" },
    ],
  },
  {
    id: "visionos",
    label: "Vision Pro",
    icon: "vision",
    stackHint: "visionOS 1+ z RealityKit, ImmersiveSpace, Volumetric",
    placeholder: "Opisz aplikacje na Vision Pro...",
    defaultTemplate: "visionos",
    requiresTier: "wybitny",
    suggestions: [
      { label: "Wizualizator 3D", prompt: "Aplikacja Vision Pro z wizualizatorem modeli 3D w ImmersiveSpace i Volumetric WindowGroup" },
      { label: "Planetarium", prompt: "Aplikacja Vision Pro pokazujaca planety i gwiazdozbiory w immersive space" },
      { label: "Sklep AR", prompt: "Aplikacja zakupowa Vision Pro z preview produktow w RealityKit" },
      { label: "Meditacja AR", prompt: "Aplikacja Vision Pro do medytacji z ambient AR environments i Spatial Audio" },
    ],
  },
];

export function getModeById(id: ProjectMode | string | undefined): ProjectModeDef {
  return PROJECT_MODES.find((m) => m.id === id) ?? PROJECT_MODES[0];
}

/** Tryby projektu dostepne dla danego tiera. */
export function availableModesForTier(
  userTier: "free" | "pro" | "wybitny" | string | undefined,
): ProjectModeDef[] {
  const tierRank: Record<string, number> = { free: 0, pro: 1, wybitny: 2 };
  const u = (userTier as string) ?? "free";
  const rank = tierRank[u] ?? 0;
  return PROJECT_MODES.filter((m) => rank >= (tierRank[m.requiresTier] ?? 0));
}

export const DEFAULT_MODE: ProjectMode = "web";
