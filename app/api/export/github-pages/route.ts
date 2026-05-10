import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { pushProjectToGitHub } from "@/lib/github";

export const runtime = "nodejs";

/**
 * Wypycha projekt do nowego repo i wlacza GitHub Pages.
 * URL bedzie {user}.github.io/{repo}.
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

  const token = session?.provider_token;
  if (!token)
    return NextResponse.json(
      { error: "Brak tokenu GitHub. Zaloguj sie przez GitHub." },
      { status: 403 },
    );

  let body: { projectId?: string; repoName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoName = (body.repoName ?? "").trim();
  if (!body.projectId || !repoName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const project = await getProject(body.projectId);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const safeName = repoName.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  const pushResult = await pushProjectToGitHub({
    accessToken: token,
    repoName: safeName,
    description: project.title,
    privateRepo: false,
    files: project.files,
  });
  if (!pushResult.ok) {
    return NextResponse.json({ error: pushResult.error }, { status: 500 });
  }

  // Wlacz GitHub Pages
  const octokit = new Octokit({ auth: token });
  const { data: ghUser } = await octokit.users.getAuthenticated();
  try {
    await octokit.repos.createPagesSite({
      owner: ghUser.login,
      repo: safeName,
      source: { branch: "main", path: "/" },
    });
  } catch {
    // Jezeli juz wlaczone, ignoruj
  }

  return NextResponse.json({
    ok: true,
    repoUrl: pushResult.repoUrl,
    pagesUrl: `https://${ghUser.login}.github.io/${safeName}/`,
  });
}
