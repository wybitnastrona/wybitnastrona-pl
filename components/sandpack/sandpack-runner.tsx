"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ProjectFiles } from "@/lib/types/project";

const SandpackInner = dynamic(
  () => import("./sandpack-inner").then((mod) => mod.SandpackInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-card text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    ),
  },
);

export type SandpackRunnerProps = {
  files: ProjectFiles;
  mode?: "editor" | "preview";
  showFileExplorer?: boolean;
  showConsole?: boolean;
};

export function SandpackRunner(props: SandpackRunnerProps) {
  return <SandpackInner {...props} />;
}
