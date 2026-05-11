import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/integrations/app-store-connect
 *
 * Zapisuje klucz ASC w user_integration_credentials.
 * Body: { displayName, keyId, issuerId, teamId, privateKey }
 *
 * TODO: zaszyfrowac privateKey przed insert (Vault / kms).
 */

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    displayName?: string;
    keyId?: string;
    issuerId?: string;
    teamId?: string;
    privateKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.keyId || !body.issuerId || !body.teamId || !body.privateKey) {
    return NextResponse.json(
      { error: "keyId, issuerId, teamId, privateKey required" },
      { status: 400 },
    );
  }

  // Basic shape validation.
  if (!body.privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    return NextResponse.json(
      { error: "privateKey must be PEM format (start with -----BEGIN PRIVATE KEY-----)" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("user_integration_credentials")
    .insert({
      user_id: user.id,
      provider: "app_store_connect",
      display_name: body.displayName ?? "My ASC Key",
      asc_key_id: body.keyId,
      asc_issuer_id: body.issuerId,
      asc_team_id: body.teamId,
      asc_private_key: body.privateKey,
    })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Zwracamy lekka liste (bez private key).
  const { data, error } = await supabase
    .from("user_integration_credentials")
    .select("id, display_name, asc_key_id, asc_team_id, created_at")
    .eq("user_id", user.id)
    .eq("provider", "app_store_connect")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ credentials: data ?? [] });
}
