"use client";

/**
 * Phone / browser preview frame.
 *
 * Owija podglad projektu w wizualna ramke odpowiednia dla platformy:
 *  - ios     -> ramka iPhone (Dynamic Island, fizyczne rogi)
 *  - android -> ramka Pixel (punch-hole kamerka)
 *  - web     -> ramka okna przegladarki (URL bar)
 *
 * Gdy `isGenerating === true` ramka dostaje pulsujacy zloty glow (Screen 3).
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PhoneFramePlatform =
  | "ios"
  | "android"
  | "web"
  | "watchos"
  | "tvos"
  | "visionos";

type Props = {
  platform: PhoneFramePlatform;
  isGenerating?: boolean;
  /** Real URL pokazywany w pasku przegladarki dla mode=web. */
  url?: string;
  children: ReactNode;
};

export function PhoneFrame({
  platform,
  isGenerating = false,
  url,
  children,
}: Props) {
  if (platform === "web") {
    return (
      <BrowserFrame isGenerating={isGenerating} url={url}>
        {children}
      </BrowserFrame>
    );
  }
  if (platform === "android") {
    return (
      <PixelFrame isGenerating={isGenerating}>{children}</PixelFrame>
    );
  }
  if (platform === "tvos") {
    return <TvFrame isGenerating={isGenerating}>{children}</TvFrame>;
  }
  if (platform === "watchos") {
    return <WatchFrame isGenerating={isGenerating}>{children}</WatchFrame>;
  }
  // ios + visionos (vision uses iOS-ish frame for now)
  return <IphoneFrame isGenerating={isGenerating}>{children}</IphoneFrame>;
}

// ─── Pulsujace zewnetrzne glow ────────────────────────────────────────────────

function GlowRing({
  isGenerating,
  radius = "rounded-[58px]",
}: {
  isGenerating: boolean;
  radius?: string;
}) {
  if (!isGenerating) return null;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-[-14px] -z-10 animate-pulse",
        radius,
        "bg-[radial-gradient(ellipse_at_center,rgba(232,220,196,0.55),rgba(251,191,36,0.35)_45%,transparent_70%)]",
        "blur-2xl",
      )}
    />
  );
}

// ─── iPhone frame ─────────────────────────────────────────────────────────────

function IphoneFrame({
  isGenerating,
  children,
}: {
  isGenerating: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#0a0a0a]">
      <div className="relative">
        <GlowRing isGenerating={isGenerating} radius="rounded-[60px]" />
        <div className="relative rounded-[55px] border-[10px] border-neutral-900 bg-black p-0 shadow-2xl shadow-black/60">
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-2 z-20 h-7 w-[110px] -translate-x-1/2 rounded-full bg-black" />
          {/* Screen */}
          <div className="relative h-[760px] w-[360px] overflow-hidden rounded-[45px] bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pixel (Android) frame ────────────────────────────────────────────────────

function PixelFrame({
  isGenerating,
  children,
}: {
  isGenerating: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#0a0a0a]">
      <div className="relative">
        <GlowRing isGenerating={isGenerating} radius="rounded-[46px]" />
        <div className="relative rounded-[42px] border-[8px] border-neutral-800 bg-black shadow-2xl shadow-black/60">
          {/* Punch-hole kamerka — Pixel-style, centered */}
          <div className="absolute left-1/2 top-3 z-20 h-3 w-3 -translate-x-1/2 rounded-full bg-neutral-900 ring-1 ring-neutral-700" />
          <div className="relative h-[760px] w-[360px] overflow-hidden rounded-[34px] bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Apple Watch frame ────────────────────────────────────────────────────────

function WatchFrame({
  isGenerating,
  children,
}: {
  isGenerating: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#0a0a0a]">
      <div className="relative">
        <GlowRing isGenerating={isGenerating} radius="rounded-[48px]" />
        <div className="relative rounded-[44px] border-[8px] border-neutral-800 bg-black shadow-2xl shadow-black/60">
          {/* Crown */}
          <div className="absolute -right-3 top-1/2 h-12 w-2 -translate-y-1/2 rounded-r bg-neutral-700" />
          <div className="relative h-[400px] w-[330px] overflow-hidden rounded-[34px] bg-black">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Apple TV — simulated CTV display ─────────────────────────────────────────

function TvFrame({
  isGenerating,
  children,
}: {
  isGenerating: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#0a0a0a] p-4">
      <div className="relative w-full max-w-[960px]">
        <GlowRing isGenerating={isGenerating} radius="rounded-[20px]" />
        <div className="relative rounded-[18px] border-[6px] border-neutral-800 bg-black shadow-2xl shadow-black/60">
          <div className="relative aspect-video overflow-hidden rounded-[10px] bg-black">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Browser window frame (web) ───────────────────────────────────────────────

function BrowserFrame({
  isGenerating,
  url,
  children,
}: {
  isGenerating: boolean;
  url?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#0a0a0a]">
      <div className="relative h-full w-full">
        {isGenerating && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-6px] -z-10 animate-pulse rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(232,220,196,0.35),transparent_70%)] blur-xl"
          />
        )}
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-beige/15 bg-card/40 shadow-xl shadow-black/40">
          {/* Browser chrome */}
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-beige/10 bg-background/60 px-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            </div>
            {url && (
              <div className="ml-2 flex-1 truncate rounded-md bg-background/60 px-2 py-1 text-[11px] font-mono text-muted-foreground">
                {url}
              </div>
            )}
          </div>
          {/* Content */}
          <div className="relative flex-1 overflow-hidden bg-white">{children}</div>
        </div>
      </div>
    </div>
  );
}
