import Link from "next/link";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/**
 * Baner ostrzegajacy o niskim saldzie punktow. Renderowany na dashboardzie
 * jezeli user ma < 100 pkt. SSR — bez flicker.
 */
export async function LowPointsBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .maybeSingle();

  const points = profile?.points ?? 0;
  if (points >= 100) return null;

  return (
    <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
        <Zap className="h-4 w-4 shrink-0" />
        <p className="flex-1">
          Masz tylko <strong>{points} kredytów</strong>. Kup pakiet, żeby kontynuować
          generowanie bez przerw.
        </p>
        <Link
          href="/pricing"
          className="rounded-md bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-50 transition hover:bg-amber-400/30"
        >
          Kup punkty
        </Link>
      </div>
    </div>
  );
}
