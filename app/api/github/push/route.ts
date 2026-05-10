import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { pushProjectToGitHub } from "@/lib/github";

export const runtime = "nodejs";

/**
 * Push projektu do nowego repozytorium GitHub.
 *
 * Body: { projectId: string, repoName: string, private?: boolean }
 *
 * Aby to dzialalo:
 *  1) Supabase Dashboard -> Authentication -> Providers -> GitHub: enable
 *  2) GitHub OAuth App z scope `repo` (lub `public_repo`)
 *  3) User loguje sie przez Github (lub linkuje konto)
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerToken = session?.provider_token;
  if (!providerToken) {
    return NextResponse.json(
      {
        error:
          "Brak tokenu GitHub. Zaloguj sie ponownie przez GitHub aby uzyskac dostep do repos.",
        code: "github_token_missing",
      },
      { status: 403 },
    );
  }

  let body: { projectId?: string; repoName?: string; private?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectId = body.projectId;
  const repoName = (body.repoName ?? "").trim();
  if (!projectId || !repoName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const project = await getProject(projectId);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const result = await pushProjectToGitHub({
    accessToken: providerToken,
    repoName: repoName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80),
    description: project.title,
    privateRepo: body.private ?? false,
    files: project.files,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: result.repoUrl });
}
