"use client";

import { ExternalLink, Plug } from "lucide-react";
import { useState } from "react";
import { GithubIcon } from "@/components/brand-icons";

const APPLICATIONS = [
  {
    id: "supabase",
    name: "Supabase",
    category: "Baza danych",
    description:
      "Baza, autoryzacja i storage. Wykorzystywane przez wybitnastrona.pl do przechowywania projektów.",
    docsUrl: "https://supabase.com/docs",
    accent: "#3ecf8e",
    initials: "S",
  },
  {
    id: "netlify",
    name: "Netlify",
    category: "Hosting",
    description:
      "Alternatywny hosting publikowanych stron. Wkrótce: deploy jednym klikiem.",
    docsUrl: "https://www.netlify.com/",
    accent: "#00ad9f",
    initials: "N",
  },
  {
    id: "figma",
    name: "Figma",
    category: "Design",
    description:
      "Importuj projekty z Figmy do generatora. Wkrótce: pelna integracja OAuth.",
    docsUrl: "https://www.figma.com/",
    accent: "#a259ff",
    initials: "F",
  },
  {
    id: "github",
    name: "GitHub",
    category: "Kod",
    description:
      "Synchronizacja generowanego kodu z repozytorium. Eksport ZIP dziala juz dzis.",
    docsUrl: "https://github.com/",
    accent: "#ffffff",
    initials: "G",
    icon: GithubIcon,
  },
];

export function ApplicationsTab() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">Aplikacje</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Połącz zewnetrzne narzedzia z kreatorem. W pierwszej wersji
          dostepne sa linki konfiguracyjne; pelne polaczenie OAuth zostanie
          wlaczone w kolejnych aktualizacjach.
        </p>
      </header>

      <div className="space-y-2">
        {APPLICATIONS.map((app) => (
          <AppRow key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

type AppRowProps = {
  app: (typeof APPLICATIONS)[number];
};

function AppRow({ app }: AppRowProps) {
  const [connected, setConnected] = useState(false);

  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-beige/15 bg-background/40 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-background"
          style={{ backgroundColor: app.accent }}
        >
          {app.icon ? <app.icon className="h-4 w-4" /> : app.initials}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {app.name}
            </p>
            <span className="rounded-full border border-beige/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-beige/80">
              {app.category}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {app.description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={app.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition hover:bg-white/5 hover:text-beige"
        >
          <ExternalLink className="h-3 w-3" />
          Dokumentacja
        </a>
        <button
          type="button"
          onClick={() => setConnected((value) => !value)}
          className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2.5 text-xs font-medium transition ${
            connected
              ? "border border-beige/30 bg-beige/10 text-beige"
              : "bg-beige text-beige-foreground hover:bg-beige/90"
          }`}
        >
          <Plug className="h-3 w-3" />
          {connected ? "Połączono" : "Połącz"}
        </button>
      </div>
    </article>
  );
}
