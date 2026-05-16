"use client";

import type { WebContainer, FileSystemTree } from "@webcontainer/api";
import type { ProjectFiles } from "@/lib/types/project";

/**
 * WebContainer manager — singleton per browser tab.
 *
 * Vercel/StackBlitz pozwala na JEDNĄ instancję WC w karcie. Boot jest leniwy
 * (na żądanie), a teardown następuje przy zmianie projektu (`resetForProject`).
 *
 * `proc.output` w WebContainerze jest `ReadableStream<string>`, ale niektóre
 * runtime'y emitują `Uint8Array` — używamy bezpiecznego dekodera.
 */

type Listener = (event: WCEvent) => void;
type WCEvent =
  | { type: "boot"; status: "starting" | "ready" }
  | { type: "install"; status: "running" | "done" | "error"; line?: string }
  | { type: "server"; url: string; port: number }
  | { type: "log"; line: string };

class WCManager {
  private container: WebContainer | null = null;
  private bootPromise: Promise<WebContainer> | null = null;
  private listeners = new Set<Listener>();
  private serverUrl: string | null = null;
  private currentProjectId: string | null = null;
  private devProcess: { kill(): void } | null = null;
  private decoder = new TextDecoder();

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: WCEvent) {
    for (const l of this.listeners) l(event);
  }

  getServerUrl(): string | null {
    return this.serverUrl;
  }

  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  private toLine(chunk: unknown): string {
    if (typeof chunk === "string") return chunk;
    if (chunk instanceof Uint8Array) return this.decoder.decode(chunk);
    if (chunk instanceof ArrayBuffer) return this.decoder.decode(new Uint8Array(chunk));
    try {
      return String(chunk);
    } catch {
      return "";
    }
  }

  async boot(): Promise<WebContainer> {
    if (this.container) return this.container;
    if (this.bootPromise) return this.bootPromise;

    this.emit({ type: "boot", status: "starting" });
    this.bootPromise = (async () => {
      const { WebContainer } = await import("@webcontainer/api");
      const wc = await WebContainer.boot({ coep: "require-corp" });
      this.container = wc;

      wc.on("server-ready", (port, url) => {
        this.serverUrl = url;
        this.emit({ type: "server", url, port });
      });

      this.emit({ type: "boot", status: "ready" });
      return wc;
    })();
    return this.bootPromise;
  }

  /**
   * Załaduj projekt do WC: mount + (opcjonalnie) npm install + dev server.
   * Jeśli załadowany jest już inny projekt, robimy soft-reset:
   * zatrzymanie dev server, czyszczenie URL — bez pełnego teardown
   * (WebContainer pozwala na jedną instancję per karta).
   */
  async loadProject(
    projectId: string,
    files: ProjectFiles,
    runCommand?: { cmd: string; args: string[] },
  ): Promise<void> {
    if (this.currentProjectId && this.currentProjectId !== projectId) {
      await this.resetForProject();
    }
    this.currentProjectId = projectId;

    const wc = await this.boot();
    const tree = filesToTree(files);
    await wc.mount(tree);

    if (!runCommand) return;

    this.emit({ type: "install", status: "running" });
    const installRes = await wc.spawn(runCommand.cmd === "npm" ? "npm" : "npm", [
      "install",
      "--no-audit",
      "--no-fund",
    ]);
    installRes.output.pipeTo(
      new WritableStream({
        write: (chunk) =>
          this.emit({ type: "log", line: this.toLine(chunk) }),
      }),
    );
    const installCode = await installRes.exit;
    if (installCode !== 0) {
      this.emit({ type: "install", status: "error" });
      return;
    }
    this.emit({ type: "install", status: "done" });

    const dev = await wc.spawn(runCommand.cmd, runCommand.args);
    this.devProcess = dev;
    dev.output.pipeTo(
      new WritableStream({
        write: (chunk) =>
          this.emit({ type: "log", line: this.toLine(chunk) }),
      }),
    );
  }

  /**
   * Uruchamia `npm run build` i strumieniuje output do callbacka.
   * Zwraca kod wyjścia (0 = sukces).
   */
  async runBuild(onOutput: (line: string) => void): Promise<number> {
    const wc = await this.boot();
    const proc = await wc.spawn("npm", ["run", "build"]);
    proc.output.pipeTo(
      new WritableStream({
        write: (chunk) => onOutput(this.toLine(chunk)),
      }),
    );
    return proc.exit;
  }

  /**
   * Rekurencyjnie odczytuje pliki z katalogu wyjściowego buildu.
   * Sprawdza kolejno: dist/ → build/ → out/.
   * Zwraca mapę { "/index.html": "...", "/assets/main.js": "..." }.
   * Pliki binarne są pomijane (readFile z 'utf-8' rzuca lub zwraca garbage).
   */
  async readDistFiles(): Promise<Record<string, string>> {
    if (!this.container) return {};

    let distDir: string | null = null;
    for (const candidate of ["dist", "build", "out"]) {
      try {
        await this.container.fs.readdir(candidate);
        distDir = candidate;
        break;
      } catch {
        // katalog nie istnieje, spróbuj następny
      }
    }
    if (!distDir) return {};

    const result: Record<string, string> = {};
    await this.readDirRecursive(distDir, distDir, result);
    return result;
  }

  private async readDirRecursive(
    baseDir: string,
    currentDir: string,
    result: Record<string, string>,
  ): Promise<void> {
    if (!this.container) return;

    let entries: Array<{ name: string; isDirectory: () => boolean }>;
    try {
      entries = (await this.container.fs.readdir(currentDir, {
        withFileTypes: true,
      })) as Array<{ name: string; isDirectory: () => boolean }>;
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = `${currentDir}/${entry.name}`;
      if (entry.isDirectory()) {
        await this.readDirRecursive(baseDir, fullPath, result);
      } else {
        try {
          const content = (await this.container.fs.readFile(
            fullPath,
            "utf-8",
          )) as string;
          // Ścieżka względna zaczynająca się od "/" (bez baseDir prefix)
          const relPath = "/" + fullPath.slice(baseDir.length + 1);
          result[relPath] = content;
        } catch {
          // Plik binarny lub nieczytelny — pomiń
        }
      }
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.container) return;
    const norm = path.startsWith("/") ? path.slice(1) : path;
    try {
      const segments = norm.split("/");
      if (segments.length > 1) {
        const dir = segments.slice(0, -1).join("/");
        await this.container.fs.mkdir(dir, { recursive: true });
      }
      await this.container.fs.writeFile(norm, content);
    } catch (err) {
      console.warn("[wc] writeFile failed", norm, err);
    }
  }

  /**
   * Uruchamia komendę w shellu WC i strumieniuje output do callbacka.
   */
  async spawn(
    command: string,
    args: string[],
    onOutput: (chunk: string) => void,
  ): Promise<{ exit: Promise<number>; write: (data: string) => void }> {
    const wc = await this.boot();
    const proc = await wc.spawn(command, args);
    proc.output.pipeTo(
      new WritableStream({
        write: (chunk) => onOutput(this.toLine(chunk)),
      }),
    );
    const writer = proc.input.getWriter();
    return {
      exit: proc.exit,
      write: (data) => void writer.write(data),
    };
  }

  /**
   * Zabija dev server i czyści URL — bez pełnego teardown.
   * Używane gdy przełączamy projekt w tej samej karcie.
   */
  async resetForProject(): Promise<void> {
    try {
      this.devProcess?.kill();
    } catch {
      /* ignore */
    }
    this.devProcess = null;
    this.serverUrl = null;
    this.currentProjectId = null;
  }

  async teardown() {
    if (!this.container) return;
    try {
      this.devProcess?.kill();
    } catch {
      /* ignore */
    }
    this.container.teardown();
    this.container = null;
    this.bootPromise = null;
    this.serverUrl = null;
    this.currentProjectId = null;
    this.devProcess = null;
  }
}

function filesToTree(files: ProjectFiles): FileSystemTree {
  const tree: FileSystemTree = {};
  for (const [path, file] of Object.entries(files)) {
    const code = typeof file === "object" && "code" in file ? file.code : "";
    const segments = path.replace(/^\//, "").split("/");
    let node: FileSystemTree = tree;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!node[seg]) node[seg] = { directory: {} };
      const dirEntry = node[seg] as { directory: FileSystemTree };
      node = dirEntry.directory;
    }
    const last = segments[segments.length - 1];
    node[last] = { file: { contents: code } };
  }
  return tree;
}

export const wcManager = new WCManager();
