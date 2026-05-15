"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Wifi, X } from "lucide-react";

type Props = {
  /** URL podgladu (np https://slug.wybitny.website lub URL z WebContainera). */
  previewUrl: string | null;
  /** Czy projekt to template Expo (wtedy QR otwiera Expo Go). */
  isExpo?: boolean;
};

/**
 * Modal z QR-kodem do otwarcia podgladu na telefonie.
 * Dla template Expo: prefix `exp://`. Dla zwyklych: zwykly URL.
 * UX: CSS transition entry, backdrop-blur-md, click-outside / ESC close.
 */
export function MobileQrButton({ previewUrl, isExpo }: Props) {
  const [open, setOpen] = useState(false);

  if (!previewUrl) return null;

  const qrUrl = isExpo
    ? previewUrl.replace(/^https?:\/\//, "exp://")
    : previewUrl;

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
        <QrModal qrUrl={qrUrl} isExpo={isExpo} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/**
 * Modal-content — wydzielony do osobnego komponentu zeby `mounted` resetowal sie
 * przy kazdym otwarciu (komponent unmount-uje sie po zamknieciu, wiec animacja
 * wejscia odtwarza sie poprawnie).
 */
function QrModal({
  qrUrl,
  isExpo,
  onClose,
}: {
  qrUrl: string;
  isExpo?: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false,
  );

  // Trigger CSS transition po pierwszym renderze.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ESC zamyka.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Portal do body — wyrwie modal ze stacking context preview/webcontainera
  // (inaczej iframe podgladu moze go przykryc) i sprawi ze fixed/inset-0 dziala
  // wzgledem viewportu, nie wzgledem rodzica z transformem.
  if (typeof window === "undefined") return null;

  const modalContent = (
    <div
      className={`fixed inset-0 z-[10000] overflow-y-auto bg-black/60 backdrop-blur-md transition-opacity duration-200 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className={`relative my-auto w-full max-w-md rounded-3xl border border-beige/15 bg-card p-8 shadow-[0_20px_70px_rgba(0,0,0,0.4)] transition-all duration-200 ${
          mounted
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.97] opacity-0"
        }`}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-beige/15 bg-background/50 text-muted-foreground transition hover:border-beige/40 hover:bg-white/5 hover:text-foreground"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 pr-12">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-beige/20 bg-beige/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-beige/80">
            <Smartphone className="h-3 w-3" />
            Podglad mobilny
          </div>
          <h3
            id="qr-modal-title"
            className="text-xl font-medium text-foreground"
          >
            Otwórz na telefonie
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {isExpo
              ? "Zeskanuj kod aplikacją Expo Go (iOS/Android), aby zobaczyć podgląd projektu na żywo."
              : "Zeskanuj kod aparatem telefonu — strona otworzy się w przeglądarce mobilnej."}
          </p>
        </div>

        <div className="flex items-center justify-center rounded-2xl border border-beige/10 bg-white p-6 shadow-inner">
          <QRCodeSVG value={qrUrl} size={isMobile ? 200 : 240} level="M" />
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-beige/10 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
          <Wifi className="h-3.5 w-3.5 shrink-0 text-beige/70" />
          <span className="leading-relaxed">
            Wymagana ta sama siec Wi-Fi co Twoj komputer (dla podglądu z
            WebContainera).
          </span>
        </div>

        <p className="mt-3 truncate text-center font-mono text-[10px] text-muted-foreground">
          {qrUrl}
        </p>

        {isExpo && (
          <div className="mt-5 rounded-xl border border-beige/10 bg-background/40 p-4 text-[12px] leading-relaxed text-muted-foreground">
            <p className="mb-2 font-medium text-foreground/90">Jak otworzyc:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                Zainstaluj <span className="font-mono text-beige">Expo Go</span>{" "}
                z App Store / Google Play.
              </li>
              <li>Otworz Expo Go i wybierz &ldquo;Scan QR code&rdquo;.</li>
              <li>
                Lub wpisz URL recznie w polu &ldquo;Enter URL manually&rdquo;.
              </li>
            </ol>
          </div>
        )}
      </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
