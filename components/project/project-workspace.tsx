"use client";

import { ProjectTopbar } from "@/components/project/project-topbar";
import { ChatPanel } from "@/components/project/chat-panel";
import { SandpackRunner } from "@/components/sandpack/sandpack-runner";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
  rootDomain: string;
  appUrl: string;
};

export function ProjectWorkspace({ project, rootDomain, appUrl }: Props) {
  const hasFiles = Object.keys(project.files ?? {}).filter(
    (key) => !["/index.html", "/index.tsx"].includes(key),
  ).length > 1;

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <ProjectTopbar
        project={project}
        rootDomain={rootDomain}
        appUrl={appUrl}
      />

      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[420px_1fr]">
        <div className="border-r border-beige/10 min-h-0 hidden lg:block">
          <ChatPanel
            projectId={project.id}
            initialPrompt={project.prompt}
            hasFiles={hasFiles}
          />
        </div>

        <div className="lg:hidden h-[40vh] border-b border-beige/10">
          <ChatPanel
            projectId={project.id}
            initialPrompt={project.prompt}
            hasFiles={hasFiles}
          />
        </div>

        <div className="min-h-0">
          <SandpackRunner files={project.files} mode="editor" />
        </div>
      </div>
    </div>
  );
}
