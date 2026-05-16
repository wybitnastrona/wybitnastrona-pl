"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

export function CreditsPill() {
  const { user } = useAuth();
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/me/points")
      .then((r) => r.json())
      .then((data: { points?: number }) => {
        if (typeof data.points === "number") setPoints(data.points);
      })
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/pricing"
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-beige/25 bg-beige/10 px-3 py-1 text-xs font-medium text-beige transition hover:border-beige/40 hover:bg-beige/15"
        title="Kredyty - kliknij aby zobaczyc plany"
      >
        <Zap className="h-3 w-3" />
        {points === null ? "..." : points.toLocaleString("pl-PL")} kr
      </Link>
      <Link
        href="/pricing"
        className="cursor-pointer rounded-full border border-beige/20 bg-background/40 px-2 py-1 text-[10px] text-beige/80 transition hover:border-beige/40 hover:text-beige"
      >
        Plany
      </Link>
    </div>
  );
}
