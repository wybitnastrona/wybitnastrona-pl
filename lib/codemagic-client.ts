import "server-only";

/**
 * Codemagic REST API client.
 *
 * Codemagic to chmurowy build pipeline (macOS + Linux runners), wspiera
 * Xcode (Swift / SwiftUI), Gradle (Kotlin / Android), React Native, Flutter.
 *
 * Doc: https://docs.codemagic.io/rest-api/overview/
 * Wymagany API token (Settings > Integrations w Codemagic UI).
 * Endpointy: POST /builds (start), GET /builds/:id, GET /builds/:id/logs.
 */

const CODEMAGIC_API = "https://api.codemagic.io";

export type CodemagicBuildStatus =
  | "queued"
  | "fetching"
  | "preparing"
  | "building"
  | "finished"
  | "failed"
  | "canceled";

type StartBuildArgs = {
  /** App ID w Codemagic (przypisany przy probie polaczenia git repo). */
  appId: string;
  /** Workflow id z codemagic.yaml (np. "ios-workflow"). */
  workflowId: string;
  /** Branch git (na repo dolaczonym do Codemagic). */
  branch: string;
  /** Per-build environment variables (np. ASC keys). */
  environment?: Record<string, string>;
};

export class CodemagicClient {
  constructor(private token: string) {}

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${CODEMAGIC_API}${path}`, {
      method,
      headers: {
        "x-auth-token": this.token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(
        `Codemagic ${method} ${path} failed: ${res.status} ${await res.text()}`,
      );
    }
    return res.json() as Promise<T>;
  }

  async startBuild(
    args: StartBuildArgs,
  ): Promise<{ buildId: string; status: CodemagicBuildStatus }> {
    const data = await this.request<{
      buildId: string;
      status: CodemagicBuildStatus;
    }>("POST", "/builds", {
      appId: args.appId,
      workflowId: args.workflowId,
      branch: args.branch,
      environment: args.environment
        ? { variables: args.environment }
        : undefined,
    });
    return data;
  }

  async getBuild(buildId: string): Promise<{
    build: {
      _id: string;
      status: CodemagicBuildStatus;
      startedAt?: string;
      finishedAt?: string;
      buildActions?: Array<{
        name: string;
        status: CodemagicBuildStatus;
      }>;
      artefacts?: Array<{ name: string; url: string }>;
    };
  }> {
    return this.request("GET", `/builds/${buildId}`);
  }

  async getBuildLogs(buildId: string): Promise<string> {
    const res = await fetch(`${CODEMAGIC_API}/builds/${buildId}/logs`, {
      headers: { "x-auth-token": this.token },
    });
    if (!res.ok) throw new Error(`Codemagic logs failed: ${res.status}`);
    return res.text();
  }
}
