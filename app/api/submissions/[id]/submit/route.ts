import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AscClient } from "@/lib/asc-client";

export const runtime = "nodejs";

/**
 * POST /api/submissions/[id]/submit
 *
 * Po udanym buildzie i uplodzie do App Store Connect, wysylamy aplikacje
 * do recenzji Apple (TestFlight beta lub App Store).
 *
 * Wymaga ze submission.status === "uploaded" i mamy build ID z ASC.
 */

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: submission } = await supabase
    .from("project_submissions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.status !== "uploaded") {
    return NextResponse.json(
      {
        error:
          "Submission must be in 'uploaded' status before submission. Current: " +
          submission.status,
      },
      { status: 400 },
    );
  }

  // Wez credentials
  const { data: creds } = await supabase
    .from("user_integration_credentials")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "app_store_connect")
    .eq("asc_key_id", submission.asc_key_id)
    .maybeSingle();
  if (!creds?.asc_private_key) {
    return NextResponse.json({ error: "ASC credentials missing" }, { status: 400 });
  }

  const asc = new AscClient({
    keyId: creds.asc_key_id,
    issuerId: creds.asc_issuer_id,
    privateKeyPem: creds.asc_private_key,
  });

  try {
    // Build ID musimy uzyskac z webhooka Codemagic po uplodzie do ASC.
    // Tu zakladamy ze webhook uaktualnil `submission.asc_app_id` z build id.
    if (!submission.asc_app_id) {
      return NextResponse.json(
        { error: "ASC build ID not yet propagated. Try again in 30s." },
        { status: 425 },
      );
    }
    const result = await asc.submitForBetaReview(submission.asc_app_id);
    await supabase
      .from("project_submissions")
      .update({
        status: "submitted",
        testflight_url: `https://appstoreconnect.apple.com/apps/${submission.asc_app_id}/testflight/ios`,
      })
      .eq("id", id);

    return NextResponse.json({ submissionId: result.data.id });
  } catch (err) {
    console.error("[submissions/submit] failed:", err);
    await supabase
      .from("project_submissions")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Submit error",
      })
      .eq("id", id);
    return NextResponse.json({ error: "Submit failed" }, { status: 502 });
  }
}
