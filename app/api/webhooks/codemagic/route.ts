import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Codemagic webhook receiver.
 *
 * Codemagic Dashboard → Settings → Webhooks → URL =
 *   https://wybitnastrona.pl/api/webhooks/codemagic
 *
 * Body (uproszczone):
 *   {
 *     event: "build.status_changed",
 *     payload: {
 *       buildId: "...",
 *       status: "building" | "finished" | "failed",
 *       buildActions: [{ name, status }],
 *       artefacts: [{ name, url }]
 *     }
 *   }
 *
 * Uwaga: ten endpoint NIE ma auth headera Supabase — to webhook. RLS
 * obchodzimy uzywajac service role key.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Service role not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type CodemagicBuildEvent = {
  event?: string;
  payload?: {
    buildId?: string;
    status?: string;
    buildActions?: Array<{ name: string; status: string }>;
    artefacts?: Array<{ name: string; url: string }>;
  };
};

export async function POST(req: Request) {
  // (Opcjonalna) weryfikacja secret z naglowka X-Codemagic-Signature.
  // const sig = req.headers.get("x-codemagic-signature");
  // const secret = process.env.CODEMAGIC_WEBHOOK_SECRET;

  let body: CodemagicBuildEvent;
  try {
    body = (await req.json()) as CodemagicBuildEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const buildId = body.payload?.buildId;
  if (!buildId) {
    return NextResponse.json({ received: true, warning: "no buildId" });
  }

  const supabase = getServiceClient();

  // Znajdz submission po codemagic_build_id.
  const { data: submission } = await supabase
    .from("project_submissions")
    .select("id, status, log_lines")
    .eq("codemagic_build_id", buildId)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ received: true, warning: "submission not found" });
  }

  // Mapuj Codemagic status na nasz enum.
  const cmStatus = body.payload?.status ?? "building";
  let mappedStatus: string = submission.status;
  let errorMessage: string | null = null;
  if (cmStatus === "queued") mappedStatus = "queued";
  else if (cmStatus === "preparing" || cmStatus === "building") mappedStatus = "building";
  else if (cmStatus === "finished") {
    // Po finished sprawdzamy czy artefakt IPA / AAB istnieje — jezeli tak
    // to status "uploaded" (do ASC / Play), inaczej "building".
    const hasArtifact =
      (body.payload?.artefacts ?? []).some(
        (a) => a.name?.endsWith(".ipa") || a.name?.endsWith(".aab"),
      ) ?? false;
    mappedStatus = hasArtifact ? "uploaded" : "building";
  } else if (cmStatus === "failed" || cmStatus === "canceled") {
    mappedStatus = "failed";
    errorMessage = "Codemagic build " + cmStatus;
  }

  // Dolacz logi (tylko nazwy buildAction).
  const newLogLines = (body.payload?.buildActions ?? []).map(
    (a) => `[${a.status}] ${a.name}`,
  );
  const logLines = [
    ...((submission.log_lines as string[] | null) ?? []),
    ...newLogLines,
  ].slice(-200); // ostatnie 200

  const updates: Record<string, unknown> = {
    codemagic_status: cmStatus,
    status: mappedStatus,
    log_lines: logLines,
  };
  if (errorMessage) updates.error_message = errorMessage;

  await supabase
    .from("project_submissions")
    .update(updates)
    .eq("id", submission.id);

  return NextResponse.json({ received: true });
}
