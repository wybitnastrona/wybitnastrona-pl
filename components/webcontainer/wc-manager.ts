"use client";

import type { WebContainer, FileSystemTree } from "@webcontainer/api";
import type { ProjectFiles } from "@/lib/types/project";

/**
 * WebContainer manager — singleton patterns.
 *
 * Vercel/StackBlitz pozwala na JEDNĄ instancje WC w karcie.
 * Boot jest leniwy (na zadanie), a teardown nastepuje przy zmianie projektu.
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

  async boot(): Promise<WebContainer> {
    if (this.container) return this.container;
    if (this.bootPromise) return this.bootPromise;

    this.emit({ type: "boot", status: "starting" });
    this.bootPromise = (async () => {
      const { WebContainer } = await import("@webcontainer/api");
      const wc = await WebContainer.boot();
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
   * Mount projekt z bazy do WC i (opcjonalnie) zainstaluj zaleznosci + uruchom dev.
   */
  async loadProject(
    files: ProjectFiles,
    runCommand?: { cmd: string; args: string[] },
  ): Promise<void> {
    const wc = await this.boot();
    const tree = filesToTree(files);
    await wc.mount(tree);

    if (!runCommand) return;

    // npm install
    this.emit({ type: "install", status: "running" });
    const installRes = await wc.spawn("npm", ["install"]);
    installRes.output.pipeTo(
      new WritableStream({
        write: (line) => this.emit({ type: "log", line }),
      }),
    );
    const installCode = await installRes.exit;
    if (installCode !== 0) {
      this.emit({ type: "install", status: "error" });
      return;
    }
    this.emit({ type: "install", status: "done" });

    // npm run dev (dev server)
    const dev = await wc.spawn(runCommand.cmd, runCommand.args);
    dev.output.pipeTo(
      new WritableStream({
        write: (line) => this.emit({ type: "log", line }),
      }),
    );
  }

  /**
   * Sproboj zaktualizowac pojedynczy plik bez remountu.
   */
  async writeFile(path: string, content: string): Promise<void> {
    if (!this.container) return;
    const norm = path.startsWith("/") ? path.slice(1) : path;
    await this.container.fs.writeFile(norm, content);
  }

  /**
   * Wykonuje komende w terminalu WC i strumieniuje output do callbacka.
   * Zwraca obiekt z process.exit (Promise) i input WritableStream.
   */
  async spawn(
    command: string,
    args: string[],
    onOutput: (chunk: string) => void,
  ): Promise<{ exit: Promise<number>; write: (data: string) => void }> {
    const wc = await this.boot();
    const proc = await wc.spawn(command, args);
    proc.output.pipeTo(
      new WritableStream({ write: (chunk) => onOutput(chunk) }),
    );
    const writer = proc.input.getWriter();
    return {
      exit: proc.exit,
      write: (data) => void writer.write(data),
    };
  }

  async teardown() {
    if (!this.container) return;
    this.container.teardown();
    this.container = null;
    this.bootPromise = null;
    this.serverUrl = null;
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

// Eksportujemy globalna instancje.
export const wcManager = new WCManager();
