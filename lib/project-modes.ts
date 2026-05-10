/**
 * Tryby projektow — emergent.sh style.
 * Kazdy tryb definiuje: label, ikone, placeholder prompta, sugestie,
 * domyslny szablon Sandpack i obraz kontenera (kosmetic label jak w emergent).
 */

import type { TemplateId } from "@/lib/templates";

export type ProjectMode = "fullstack" | "mobile" | "landing";

export type ProjectModeDef = {
  id: ProjectMode;
  label: string;
  /** Lucide icon name (uzywany w ModeTabs). */
  icon: "layers" | "smartphone" | "layout-template";
  placeholder: string;
  defaultTemplate: TemplateId;
  suggestions: { label: string; prompt: string }[];
  /** Jesli true — zakładka pokazana, ale zablokowana (overlay "Wkrotce"). */
  comingSoon?: boolean;
};

export const PROJECT_MODES: ProjectModeDef[] = [
  {
    id: "fullstack",
    label: "Full Stack App",
    icon: "layers",
    placeholder: "Zbuduj mi aplikacje SaaS do...",
    defaultTemplate: "nextjs",
    suggestions: [
      { label: "Menedzer zadan", prompt: "Aplikacja do zarzadzania zadaniami z tablicami Kanban, auth i komentarzami" },
      { label: "Sklep internetowy", prompt: "Sklep internetowy z katalogiem produktow, koszykiem, checkout i panelem admina" },
      { label: "CRM dla agencji", prompt: "CRM dla agencji z listą klientow, etapami sprzedazy i historią kontaktow" },
      { label: "Generator faktur", prompt: "Aplikacja do wystawiania faktur VAT z PDF, listą klientow i historią platnosci" },
    ],
  },
  {
    id: "mobile",
    label: "Mobile App",
    icon: "smartphone",
    placeholder: "Zbuduj mi aplikacje mobilna do...",
    defaultTemplate: "expo",
    suggestions: [
      { label: "Dostawa jedzenia", prompt: "Aplikacja do zamawiania jedzenia jak Uber Eats" },
      { label: "Flappy Bird", prompt: "Klон Flappy Bird w React Native" },
      { label: "Generator przepisow", prompt: "Aplikacja z przepisami kulinarnymi, filtrowaniem i ulubionym" },
      { label: "Habit Tracker", prompt: "Aplikacja do sledzenia nawykow z kalendarzem i streak'ami" },
    ],
    comingSoon: true,
  },
  {
    id: "landing",
    label: "Landing Page",
    icon: "layout-template",
    placeholder: "Zbuduj mi piekna strone dla...",
    defaultTemplate: "react-ts",
    suggestions: [
      { label: "Landing page dla trenera", prompt: "Landing page dla trenera personalnego z hero, oferta, opiniami i formularzem" },
      { label: "Portfolio fotografa", prompt: "Portfolio fotografa z galeria zdjec i formularzem kontaktowym" },
      { label: "Strona restauracji", prompt: "Strona restauracji z menu, galeria, rezerwacja stolika i mapa dojazdu" },
      { label: "Agencja kreatywna", prompt: "Strona agencji kreatywnej z portfolio, zespolem i formularzem zapytan" },
    ],
  },
];

export function getModeById(id: ProjectMode | string | undefined): ProjectModeDef {
  return PROJECT_MODES.find((m) => m.id === id) ?? PROJECT_MODES[2];
}

export const DEFAULT_MODE: ProjectMode = "landing";
