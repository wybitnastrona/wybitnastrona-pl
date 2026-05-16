"use client";

import { Sparkles } from "lucide-react";

export function AddOnsTab() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">Dodatki</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Funkcje premium, ktore możesz aktywowac w kreatorze. Wkrótce.
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-beige/20 bg-background/40 p-6 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-beige/20 bg-beige/10 text-beige">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="mt-3 text-sm font-medium text-foreground">
          Tu pojawia sie dodatki
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Pracujemy nad rozszerzeniami: zaawansowane modele AI, generator
          designu, edytor szablonow, marketplace komponentow.
        </p>
      </div>
    </div>
  );
}
