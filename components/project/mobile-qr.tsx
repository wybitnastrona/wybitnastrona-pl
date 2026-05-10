"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, X } from "lucide-react";

type Props = {
  /** URL podgladu (np https://slug.wybitny.website lub URL z WebContainera). */
  previewUrl: string | null;
  /** Czy projekt to template Expo (wtedy QR otwiera Expo Go). */
  isExpo?: boolean;
};

/**
 * Modal z QR-kodem do otwarcia podgladu na telefonie.
 * Dla template Expo: prefix `exp://`. Dla zwyklych: zwykly URL.
 */
export function MobileQrButton({ previewUrl, isExpo }: Props) {
  const [open, setOpen] = useState(false);
  const [isMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false,
  );

  if (!previewUrl) return null;

  const qrUrl = isExpo ? previewUrl.replace(/^https?:\/\//, "exp://") : previewUrl;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Otwórz na telefonie"
        className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-beige/15 bg-background/40 px-2 text-[11px] text-muted-foreground transition hover:border-beige/30 hover:text-foreground"
      >
        <Smartphone className="h-3 w-3" />
        QR
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl border border-beige/15 bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-card-hover hover:text-foreground"
              aria-label="Zamknij"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="mb-1 text-base font-medium">Otwórz na telefonie</h3>
            <p className="mb-5 text-xs text-muted-foreground">
              {isExpo
                ? "Zeskanuj kod aplikacją Expo Go (iOS/Android)."
                : "Zeskanuj kod aparatem telefonu — strona otworzy się w przeglądarce."}
            </p>

            <div className="flex items-center justify-center rounded-lg border border-beige/10 bg-white p-4">
              <QRCodeSVG value={qrUrl} size={isMobile ? 200 : 240} level="M" />
            </div>

            <p className="mt-4 truncate text-center font-mono text-[10px] text-muted-foreground">
              {qrUrl}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
