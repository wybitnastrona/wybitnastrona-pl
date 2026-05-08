"use client";

import {
  Briefcase,
  Coffee,
  LayoutDashboard,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

type Suggestion = {
  icon: LucideIcon;
  title: string;
  prompt: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard dla trenera personalnego",
    prompt:
      "Zbuduj dashboard dla trenera personalnego z listą klientów, harmonogramem treningów i statystykami postępów.",
  },
  {
    icon: Coffee,
    title: "Landing page dla kawiarni",
    prompt:
      "Stwórz landing page dla butikowej kawiarni z menu, sekcją o nas, galerią zdjęć i formularzem rezerwacji stolika.",
  },
  {
    icon: ShoppingBag,
    title: "Sklep internetowy z butami",
    prompt:
      "Zaprojektuj sklep internetowy z butami: katalog produktów, filtry rozmiaru i koloru, koszyk i checkout.",
  },
  {
    icon: Briefcase,
    title: "Portfolio dla freelancera",
    prompt:
      "Wygeneruj eleganckie portfolio dla freelancera z opisem usług, case studies, sekcją testimoniali i formularzem kontaktowym.",
  },
];

type SuggestionGridProps = {
  onSelect: (prompt: string) => void;
};

export function SuggestionGrid({ onSelect }: SuggestionGridProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
        <button
          key={title}
          type="button"
          onClick={() => onSelect(prompt)}
          className="group flex flex-col items-start gap-3 rounded-xl border border-beige/10 bg-card p-4 text-left transition hover:border-beige/40 hover:bg-card/80 focus:outline-none focus-visible:border-beige/60 focus-visible:ring-2 focus-visible:ring-beige/30"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-beige/20 bg-background text-beige transition group-hover:border-beige/50 group-hover:bg-beige/10">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-foreground/90 transition group-hover:text-beige">
            {title}
          </span>
        </button>
      ))}
    </div>
  );
}
