/**
 * Tryby projektow — Rork.com style.
 * Kazdy tryb to platforma docelowa: iOS (Swift), Android (Kotlin), Web (React).
 *
 * iOS / Android sa code-only (brak preview w przegladarce — eksport ZIP do Xcode/Android Studio).
 * Web nadal uzywa Sandpack / WebContainer.
 */

import type { TemplateId } from "@/lib/templates";

export type ProjectMode = "ios" | "android" | "web";

export type ProjectModeDef = {
  id: ProjectMode;
  label: string;
  /** Lucide icon name (uzywany w PlatformSelector). */
  icon: "apple" | "android" | "globe";
  placeholder: string;
  defaultTemplate: TemplateId;
  suggestions: { label: string; prompt: string }[];
  /** Krotki opis stacku — pokazywany w dropdownie. */
  stackHint: string;
  /** Jesli true — zakładka pokazana, ale zablokowana (overlay "Wkrotce"). */
  comingSoon?: boolean;
};

export const PROJECT_MODES: ProjectModeDef[] = [
  {
    id: "ios",
    label: "Aplikacja iOS",
    icon: "apple",
    stackHint: "iPad, Apple Watch i wiecej z SwiftUI",
    placeholder: "Opisz aplikacje iOS, ktora chcesz zbudowac...",
    defaultTemplate: "ios",
    suggestions: [
      { label: "Trener fitness", prompt: "Aplikacja iOS dla trenera fitness z trackingiem trenningow, statystykami i wykresami" },
      { label: "Lista zakupow", prompt: "Aplikacja iOS do listy zakupow z kategoriami, podzialem na sklepy i synchronizacja iCloud" },
      { label: "Pomodoro Timer", prompt: "Aplikacja iOS Pomodoro z timerem, statystyka focusu i HealthKit" },
      { label: "Habit Tracker", prompt: "Aplikacja iOS do sledzenia nawykow z streak'ami i widgetami WidgetKit" },
    ],
  },
  {
    id: "android",
    label: "Aplikacja Android",
    icon: "android",
    stackHint: "Natywny Android z Kotlin + Jetpack Compose",
    placeholder: "Opisz aplikacje Android, ktora chcesz zbudowac...",
    defaultTemplate: "android",
    suggestions: [
      { label: "Menedzer zadan", prompt: "Aplikacja Android do zarzadzania zadaniami z Material 3, kategoriami i powiadomieniami" },
      { label: "Czytnik RSS", prompt: "Aplikacja Android czytnik RSS z trybem offline i ciemnym motywem" },
      { label: "Notepad z OCR", prompt: "Aplikacja Android do notatek z OCR z kamery (CameraX + ML Kit)" },
      { label: "Tracker wydatkow", prompt: "Aplikacja Android do trackowania wydatkow z wykresami i eksportem CSV" },
    ],
  },
  {
    id: "web",
    label: "Strona internetowa",
    icon: "globe",
    stackHint: "Vite + React + Tailwind",
    placeholder: "Opisz strone lub aplikacje webowa...",
    defaultTemplate: "react-ts",
    suggestions: [
      { label: "Landing dla trenera", prompt: "Landing page dla trenera personalnego z hero, oferta, opiniami i formularzem" },
      { label: "Portfolio fotografa", prompt: "Portfolio fotografa z galeria zdjec i formularzem kontaktowym" },
      { label: "Strona restauracji", prompt: "Strona restauracji z menu, galeria, rezerwacja stolika i mapa dojazdu" },
      { label: "Sklep internetowy", prompt: "Sklep internetowy z katalogiem produktow, koszykiem i checkoutem" },
    ],
  },
];

export function getModeById(id: ProjectMode | string | undefined): ProjectModeDef {
  return PROJECT_MODES.find((m) => m.id === id) ?? PROJECT_MODES[2];
}

export const DEFAULT_MODE: ProjectMode = "web";
