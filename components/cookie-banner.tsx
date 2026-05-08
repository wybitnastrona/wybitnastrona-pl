"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie-consent";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return "ssr";
  }
}

function getServerSnapshot() {
  return "ssr";
}

export function CookieBanner() {
  const stored = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);

  const visible = stored === null && !dismissed;

  function persist(level: "all" | "essential") {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ level, at: new Date().toISOString() }),
      );
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-beige/20 bg-card/95 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-beige/20 bg-background text-beige">
            <Cookie className="h-4 w-4" />
          </span>
          <span className="text-xs uppercase tracking-wider text-beige/80 sm:hidden">
            Cookies
          </span>
        </div>
        <p className="flex-1 text-sm text-foreground/90">
          Uzywamy ciasteczek niezbednych do dzialania uslugi i opcjonalnych do
          analityki. Wiecej w{" "}
          <Link
            href="/legal/privacy"
            className="text-beige underline-offset-4 hover:underline"
          >
            polityce prywatnosci
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => persist("essential")}
          >
            Tylko niezbedne
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => persist("all")}
            className="bg-beige text-beige-foreground hover:bg-beige/90"
          >
            Akceptuj wszystkie
          </Button>
        </div>
      </div>
    </div>
  );
}
