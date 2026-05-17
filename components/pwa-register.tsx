"use client";

import { useEffect } from "react";

/**
 * Rejestruje service worker w przegladarce. Komponent montowany w layout.tsx.
 *
 * Service worker jest aktywny TYLKO w produkcji i TYLKO na domenie wybitnastrona.pl.
 * Na poddomenie projektu (*.wybitny.website) wyrejestrowuje istniejące SW,
 * żeby nie cachowały złych wersji opublikowanych stron.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const hostname = window.location.hostname;
    const isMainDomain =
      hostname === "wybitnastrona.pl" ||
      hostname.endsWith(".wybitnastrona.pl") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";

    if (!isMainDomain) {
      // Wyrejestruj SW błędnie zainstalowany na subdomenie projektu
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    if (process.env.NODE_ENV !== "production") return;

    // Item 92: cache busting. updateViaCache=none zmusza przeglądarkę żeby
    // ZAWSZE pobierała świeży /sw.js przy każdej rejestracji (zamiast cache).
    // Dzięki temu po deploy nowej wersji SW od razu się aktualizuje.
    // Dodajemy query param z timestampem buildu (Vercel) żeby uniknąć cache CDN.
    const swUrl = process.env.NEXT_PUBLIC_BUILD_ID
      ? `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID}`
      : "/sw.js";
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: "none" })
      .then((reg) => {
        // Sprawdź czy jest nowa wersja co 60 minut (gdy strona długo otwarta).
        const intervalId = setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);
        return () => clearInterval(intervalId);
      })
      .catch((err) => console.warn("[pwa] SW register failed:", err));
  }, []);

  return null;
}
