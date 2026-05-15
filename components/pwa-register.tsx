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

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[pwa] SW register failed:", err));
  }, []);

  return null;
}
