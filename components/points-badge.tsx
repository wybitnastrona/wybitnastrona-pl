"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import Link from "next/link";

type Props = {
  /** Opcjonalne saldo przekażane serwerowo (SSR),
   *  aby uniknac migania przy pierwszym renderze. */
  initialPoints?: number;
};

export function PointsBadge({ initialPoints }: Props) {
  const [points, setPoints] = useState<number | null>(initialPoints ?? null);

  useEffect(() => {
    // Odświeżaj saldo co 30 sekund (po kazdym generowaniu router.refresh() + ten hook)
    let cancelled = false;

    async function fetchPoints() {
      try {
        const res = await fetch("/api/me/points", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { points: number };
        if (!cancelled) setPoints(data.points);
      } catch {
        // cicho ignoruj bledy sieci
      }
    }

    void fetchPoints();
    const id = setInterval(fetchPoints, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (points === null) return null;

  const isLow = points < 100;

  return (
    <Link
      href="/pricing"
      title="Twoje punkty - kliknij aby dokupic"
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition hover:opacity-80 ${
        isLow
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-beige/20 bg-card/60 text-beige/90"
      }`}
    >
      <Zap className="h-3 w-3 shrink-0" />
      {points.toLocaleString("pl-PL")} pkt
    </Link>
  );
}
