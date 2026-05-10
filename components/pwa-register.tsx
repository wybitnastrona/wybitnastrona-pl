"use client";

import { useEffect } from "react";

/**
 * Rejestruje service worker w przegladarce. Komponent montowany w layout.tsx.
 *
 * Service worker jest aktywny TYLKO w produkcji (next dev nie obsluguje SW poprawnie).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const url = "/sw.js";
    navigator.serviceWorker
      .register(url)
      .catch((err) => console.warn("[pwa] SW register failed:", err));
  }, []);

  return null;
}
