import "server-only";
import { Octokit } from "@octokit/rest";
import type { ProjectFiles } from "@/lib/types/project";

/**
 * Push wszystkich plikow projektu do nowego repozytorium GitHub.
 *
 * Wymagany dostep: provider GitHub w Supabase Auth z scope `repo`.
 * Token (provider_token) jest pobierany z sesji Supabase.
 */
export async function pushProjectToGitHub(args: {
  accessToken: string;
  repoName: string;
  description?: string;
  privateRepo?: boolean;
  files: ProjectFiles;
}): Promise<{ ok: true; repoUrl: string } | { ok: false; error: string }> {
  const octokit = new Octokit({ auth: args.accessToken });

  try {
    // 1. Stworz repo
    const { data: user } = await octokit.users.getAuthenticated();
    const owner = user.login;

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: args.repoName,
      description: args.description,
      private: args.privateRepo ?? false,
      auto_init: true,
    });

    // 2. Pobierz default branch SHA
    const branch = repo.default_branch;
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: args.repoName,
      ref: `heads/${branch}`,
    });
    const baseSha = ref.object.sha;
    const { data: baseCommit } = await octokit.git.getCommit({
      owner,
      repo: args.repoName,
      commit_sha: baseSha,
    });

    // 3. Stworz blob dla kazdego pliku
    const blobs = await Promise.all(
      Object.entries(args.files).map(async ([path, file]) => {
        const code = typeof file === "object" && "code" in file ? file.code : "";
        const { data } = await octokit.git.createBlob({
          owner,
          repo: args.repoName,
          content: code,
          encoding: "utf-8",
        });
        return {
          path: path.replace(/^\//, ""),
          mode: "100644" as const,
          type: "blob" as const,
          sha: data.sha,
        };
      }),
    );

    // 4. Stworz tree
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo: args.repoName,
      base_tree: baseCommit.tree.sha,
      tree: blobs,
    });

    // 5. Commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo: args.repoName,
      message: "Initial commit from wybitnastrona.pl",
      tree: tree.sha,
      parents: [baseSha],
    });

    // 6. Push
    await octokit.git.updateRef({
      owner,
      repo: args.repoName,
      ref: `heads/${branch}`,
      sha: commit.sha,
    });

    return { ok: true, repoUrl: repo.html_url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown GitHub error";
    return { ok: false, error: msg };
  }
}
