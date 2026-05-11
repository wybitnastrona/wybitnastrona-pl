import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/submissions/android
 *
 * Tworzy submission dla Androida + ewentualnie wgrywa keystore.
 * Format: multipart/form-data (bo plik .jks).
 *
 * Pola:
 *   projectId, platform="android", appId, versionName, versionCode,
 *   track, minSdk, targetSdk, splits (JSON), proguard, keystore (file),
 *   keystorePassword, keyAlias, keyPassword
 */

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const projectId = form.get("projectId") as string | null;
  if (!projectId)
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  // Sprawdz ownership projektu.
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.user_id !== user.id)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // (Optional) zapisz keystore do Supabase Storage.
  // Bucket: "submissions-keystores" — RLS owner-only.
  const keystoreFile = form.get("keystore") as File | null;
  let keystorePath: string | null = null;
  if (keystoreFile && keystoreFile.size > 0) {
    const objectPath = `${user.id}/${Date.now()}-${keystoreFile.name}`;
    const buffer = new Uint8Array(await keystoreFile.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from("submissions-keystores")
      .upload(objectPath, buffer, {
        contentType: "application/octet-stream",
      });
    if (!uploadErr) keystorePath = objectPath;
  }

  // Stworz submission jako draft.
  const appName = (form.get("appId") as string | null)?.split(".").pop() ?? "Android App";
  const { data: submission, error } = await supabase
    .from("project_submissions")
    .insert({
      project_id: projectId,
      user_id: user.id,
      platform: "android",
      status: "draft",
      app_name: appName,
      bundle_id: form.get("appId") as string | null,
      version: form.get("versionName") as string | null,
      build_number: Number(form.get("versionCode") ?? 1),
      // Custom metadata pamietamy w `keywords` zeby uniknac nowych kolumn
      // (track, splits, sdk levels). W produkcji dodalbym osobna kolumne JSONB
      // np. `android_config jsonb`.
      keywords: [
        `track:${form.get("track") ?? "internal"}`,
        `minSdk:${form.get("minSdk") ?? 26}`,
        `targetSdk:${form.get("targetSdk") ?? 34}`,
        `splits:${form.get("splits") ?? "{}"}`,
        `proguard:${form.get("proguard") ?? "true"}`,
        keystorePath ? `keystore:${keystorePath}` : "keystore:none",
      ],
    })
    .select("id")
    .single();

  if (error) {
    console.error("[submissions/android] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // TODO: trigger Codemagic Android build z osobnym workflow.
  // Phase 11 v1: zwracamy submission ID, build wystartuje po przyciskiem.
  return NextResponse.json({ id: submission.id });
}
