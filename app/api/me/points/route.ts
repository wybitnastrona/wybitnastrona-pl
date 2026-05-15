import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("points, tier, stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tier = (data?.tier as string | null) ?? "free";
  const status = data?.stripe_subscription_status as string | null;
  const isPro =
    tier === "pro" && (status === "active" || status === "trialing");

  return NextResponse.json({
    points: (data?.points as number | null) ?? 0,
    tier,
    isPro,
  });
}
