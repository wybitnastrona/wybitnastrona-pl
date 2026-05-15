import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { logProjectEvent } from "@/lib/analytics-server";

export const runtime = "nodejs";

/**
 * Eksportuje projekt jako ZIP.
 *
 * UWAGA: implementacja minimalna — uzywa formatu ZIP w czystej formie tarballa
 * (jezeli klient nie obsluguje ZIP, alternatywnie zwracamy JSON z plikami).
 *
 * Klient: window.location = '/api/export/zip?projectId=...'
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const project = await getProject(projectId);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // ZIP export jest funkcja PRO. Free tier dostaje 402 z hintem upgrade.
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  const tier = profile?.tier as string | null;
  const status = profile?.stripe_subscription_status as string | null;
  const isPro =
    tier === "pro" && (status === "active" || status === "trialing");
  if (!isPro) {
    return NextResponse.json(
      {
        error: "requires_pro",
        message:
          "Pobieranie kodu jako ZIP jest dostepne w planie PRO. Wejdz na /pricing aby aktywowac.",
      },
      { status: 402 },
    );
  }

  // Lazy import zeby nie ladowal jszip jezeli nie ma uzytkownikow ekspportu.
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const [path, file] of Object.entries(project.files)) {
    const code =
      typeof file === "object" && "code" in file ? file.code : String(file);
    zip.file(path.replace(/^\//, ""), code);
  }
  const buffer = await zip.generateAsync({ type: "uint8array" });

  void logProjectEvent(supabase, {
    projectId,
    userId: user.id,
    type: "export",
    metadata: { format: "zip" },
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, "-")}.zip"`,
    },
  });
}
