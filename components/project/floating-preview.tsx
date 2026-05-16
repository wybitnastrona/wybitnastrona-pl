"use client";

/**
 * FloatingPreview - draggable, resizable floating browser preview window.
 *
 * Inspiracja: Rork.com - okno z podgladem strony ktore mozna przesuwac
 * i skalowac niezaleznie od edytora kodu.
 *
 * Zawiera:
 *  - Simulated browser chrome (kontrolki window, URL bar)
 *  - Viewport preset controls: Mobile / Tablet / Desktop
 *  - Fullscreen toggle
 *  - Draggable przez naglowek
 *  - Resizable przez uchwyt w prawym dolnym rogu
 */

import { useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
  X,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewportPreset = "mobile" | "tablet" | "desktop";

const VIEWPORT_SIZES: Record<ViewportPreset, { w: number | "100%" }> = {
  mobile: { w: 390 },
  tablet: { w: 768 },
  desktop: { w: "100%" },
};

type Props = {
  previewUrl?: string;
  onClose: () => void;
  iframeSrc?: string;
};

export function FloatingPreview({ previewUrl, onClose, iframeSrc }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // Obliczamy pozycje poczatkowa przy inicjalizacji (lazy) zamiast w useEffect.
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { x: 80, y: 60 };
    return {
      x: Math.max(0, Math.min(80, window.innerWidth - 300)),
      y: Math.max(0, Math.min(60, window.innerHeight - 200)),
    };
  });
  const [size, setSize] = useState({ w: 920, h: 580 });
  const [viewport, setViewport] = useState<ViewportPreset>("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Helper: blokuje pointer-events na iframe + ustawia globalny kursor zeby
  // drag/resize nie zrywal sie nad WebContainer iframe / DevTools.
  function lockIframesAndCursor(cursor: string) {
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((f) => {
      (f as HTMLElement).style.pointerEvents = "none";
    });
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      iframes.forEach((f) => {
        (f as HTMLElement).style.pointerEvents = "";
      });
    };
  }

  // ─── Drag header ────────────────────────────────────────────────────────────
  function onDragStart(e: React.MouseEvent) {
    if (fullscreen) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const unlock = lockIframesAndCursor("grabbing");

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(0, dragRef.current.origX + dx),
        y: Math.max(0, dragRef.current.origY + dy),
      });
    }
    function onUp() {
      dragRef.current = null;
      unlock();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ─── Resize handle ──────────────────────────────────────────────────────────
  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
    const unlock = lockIframesAndCursor("nwse-resize");

    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      setSize({
        w: Math.max(360, resizeRef.current.origW + dw),
        h: Math.max(300, resizeRef.current.origH + dh),
      });
    }
    function onUp() {
      resizeRef.current = null;
      unlock();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  const containerStyle = fullscreen
    ? {
        position: "fixed" as const,
        inset: 0,
        zIndex: 9000,
        width: "100vw",
        height: "100vh",
        borderRadius: 0,
      }
    : {
        position: "fixed" as const,
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 9000,
        borderRadius: 12,
      };

  const iframeWidth = viewport === "desktop"
    ? "100%"
    : `${VIEWPORT_SIZES[viewport].w}px`;

  const displayUrl = previewUrl ?? "preview";

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className="flex flex-col overflow-hidden border border-beige/20 bg-[#1a1a1a] shadow-2xl shadow-black/70"
    >
      {/* Window chrome header - draggable */}
      <div
        onMouseDown={onDragStart}
        className="flex h-10 shrink-0 cursor-grab select-none items-center gap-2 border-b border-white/10 bg-[#242424] px-3 active:cursor-grabbing"
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="h-3 w-3 cursor-pointer rounded-full bg-rose-500 transition hover:brightness-90"
            title="Zamknij"
          />
          <button
            type="button"
            className="h-3 w-3 cursor-pointer rounded-full bg-amber-400 transition hover:brightness-90"
            title="Minimalizuj"
          />
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            className="h-3 w-3 cursor-pointer rounded-full bg-emerald-500 transition hover:brightness-90"
            title="Pelny ekran"
          />
        </div>

        {/* URL bar */}
        <div className="mx-2 flex flex-1 items-center gap-1.5 truncate rounded-md border border-white/10 bg-[#1a1a1a] px-2 py-1 text-[11px] font-mono text-white/60">
          <span className="truncate">{displayUrl}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
            title="Odswierz"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
            title={fullscreen ? "Zmniejsz" : "Pelny ekran"}
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
            title="Zamknij"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport toolbar */}
      <div className="flex h-8 shrink-0 items-center justify-center gap-1 border-b border-white/10 bg-[#1e1e1e] px-3">
        {(["mobile", "tablet", "desktop"] as ViewportPreset[]).map((vp) => {
          const icons: Record<ViewportPreset, React.ReactNode> = {
            mobile: <Smartphone className="h-3.5 w-3.5" />,
            tablet: <Tablet className="h-3.5 w-3.5" />,
            desktop: <Monitor className="h-3.5 w-3.5" />,
          };
          const labels: Record<ViewportPreset, string> = {
            mobile: "375px",
            tablet: "768px",
            desktop: "100%",
          };
          const active = viewport === vp;
          return (
            <button
              key={vp}
              type="button"
              onClick={() => setViewport(vp)}
              className={cn(
                "inline-flex h-6 cursor-pointer items-center gap-1 rounded px-2 text-[10px] transition",
                active
                  ? "bg-beige/20 text-beige"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80",
              )}
              title={labels[vp]}
            >
              {icons[vp]}
              <span className="hidden sm:inline">{labels[vp]}</span>
            </button>
          );
        })}
      </div>

      {/* Preview area */}
      <div className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto bg-[#f5f5f5]">
        <div
          className="h-full transition-all duration-200"
          style={{ width: iframeWidth, minWidth: iframeWidth, maxWidth: iframeWidth }}
        >
          {iframeSrc ? (
            <iframe
              key={iframeKey}
              src={iframeSrc}
              className="h-full w-full border-none"
              title="Podglad strony"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
              Brak podgladu - uruchom generowanie
            </div>
          )}
        </div>
      </div>

      {/* Resize handle (bottom-right) */}
      {!fullscreen && (
        <div
          onMouseDown={onResizeStart}
          className="absolute bottom-0 right-0 cursor-se-resize p-2 text-white/20 hover:text-white/60"
          title="Zmien rozmiar"
        >
          <GripVertical className="h-4 w-4 rotate-45" />
        </div>
      )}
    </div>
  );
}
