import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CodemagicClient } from "@/lib/codemagic-client";
import { uploadProjectZip } from "@/lib/build-uploader";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/submissions/[id]/build
 *
 * Uruchamia build w Codemagic:
 *  1) Sprawdza ze submission istnieje i nalezy do uzytkownika.
 *  2) Pakuje pliki projektu, wysyla ZIP do Supabase Storage.
 *  3) Pobiera credentials (ASC keys + Codemagic token) z user_integration_credentials.
 *  4) Wywoluje Codemagic POST /builds z URL ZIP i ASC envs.
 *  5) Aktualizuje submission.status = "queued" + codemagic_build_id.
 *
 * Body: { credentials_id: string, destination: "testflight" | "appstore" }
 */

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { credentials_id?: string; destination?: "testflight" | "appstore" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.credentials_id) {
    return NextResponse.json(
      { error: "credentials_id is required" },
      { status: 400 },
    );
  }

  // Submission
  const { data: submission } = await supabase
    .from("project_submissions")
    .select("*, projects!inner(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Credentials
  const { data: ascCreds } = await supabase
    .from("user_integration_credentials")
    .select("*")
    .eq("id", body.credentials_id)
    .eq("user_id", user.id)
    .eq("provider", "app_store_connect")
    .maybeSingle();
  if (!ascCreds) {
    return NextResponse.json({ error: "ASC credentials not found" }, { status: 404 });
  }

  // Codemagic token — uzytkownik musi miec rowniez tokeny Codemagic; albo
  // uzywamy uniwersalnego tokena platformy z ENV (zalecane MVP).
  const codemagicToken =
    process.env.CODEMAGIC_PLATFORM_TOKEN ??
    (await getUserCodemagicToken(supabase, user.id));
  const codemagicAppId = process.env.CODEMAGIC_APP_ID;
  const codemagicWorkflowId =
    submission.platform === "ios" ? "ios-workflow" : "android-workflow";
  if (!codemagicToken || !codemagicAppId) {
    return NextResponse.json(
      {
        error:
          "Codemagic not configured. Set CODEMAGIC_PLATFORM_TOKEN + CODEMAGIC_APP_ID in env.",
      },
      { status: 503 },
    );
  }

  // Upload ZIP zeby Codemagic mogl pobrac.
  let zipUrl: string;
  try {
    zipUrl = await uploadProjectZip({
      id: submission.projects.id,
      files: submission.projects.files,
    });
  } catch (err) {
    console.error("[submissions/build] zip upload failed:", err);
    return NextResponse.json(
      { error: "Build upload failed" },
      { status: 500 },
    );
  }

  // Codemagic POST /builds
  try {
    const client = new CodemagicClient(codemagicToken);
    const build = await client.startBuild({
      appId: codemagicAppId,
      workflowId: codemagicWorkflowId,
      branch: "main",
      environment: {
        WYBITNA_PROJECT_ZIP_URL: zipUrl,
        ASC_KEY_ID: ascCreds.asc_key_id ?? "",
        ASC_ISSUER_ID: ascCreds.asc_issuer_id ?? "",
        ASC_TEAM_ID: ascCreds.asc_team_id ?? "",
        ASC_PRIVATE_KEY: ascCreds.asc_private_key ?? "",
        SUBMISSION_DESTINATION: body.destination ?? "testflight",
        SUBMISSION_APP_NAME: submission.app_name ?? "",
        SUBMISSION_BUNDLE_ID: submission.bundle_id ?? "",
        SUBMISSION_VERSION: submission.version ?? "1.0.0",
        SUBMISSION_BUILD_NUMBER: String(submission.build_number ?? 1),
      },
    });

    await supabase
      .from("project_submissions")
      .update({
        status: "queued",
        codemagic_workflow_id: codemagicWorkflowId,
        codemagic_build_id: build.buildId,
        codemagic_status: build.status,
        asc_key_id: ascCreds.asc_key_id,
        asc_issuer_id: ascCreds.asc_issuer_id,
        asc_team_id: ascCreds.asc_team_id,
      })
      .eq("id", id);

    return NextResponse.json({ buildId: build.buildId, status: build.status });
  } catch (err) {
    console.error("[submissions/build] codemagic failed:", err);
    await supabase
      .from("project_submissions")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Codemagic error",
      })
      .eq("id", id);
    return NextResponse.json(
      { error: "Codemagic build failed to start" },
      { status: 502 },
    );
  }
}

async function getUserCodemagicToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("user_integration_credentials")
    .select("codemagic_token")
    .eq("user_id", userId)
    .eq("provider", "codemagic")
    .maybeSingle();
  return data?.codemagic_token ?? null;
}
