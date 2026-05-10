"use client";

import { useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ProjectTopbar } from "@/components/project/project-topbar";
import {
  ChatPanel,
  type ChatPanelHandle,
} from "@/components/project/chat-panel";
import { WorkspaceCanvas } from "@/components/project/workspace-canvas";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
  /** Wiadomosci czatu zaladowane z bazy (Supabase). */
  initialMessages: UIMessage[];
  rootDomain: string;
  publishDomain: string;
  appUrl: string;
  domainPartnerUrl: string;
};

export function ProjectWorkspace({
  project,
  initialMessages,
  rootDomain,
  publishDomain,
  appUrl,
  domainPartnerUrl,
}: Props) {
  // Czy projekt ma juz wygenerowane pliki uzytkownika (pomijajac startery).
  const hasFiles =
    Object.keys(project.files ?? {}).filter(
      (key) => !["/index.html", "/index.tsx"].includes(key),
    ).length > 1;

  const [selectMode, setSelectMode] = useState(false);
  const chatRef = useRef<ChatPanelHandle>(null);

  function handleElementPick(info: {
    x: number;
    y: number;
    selector?: string;
    html?: string;
    tagName?: string;
  }) {
    setSelectMode(false);
    let hint: string;
    if (info.selector) {
      hint =
        `Zmien element CSS selector \`${info.selector}\`` +
        (info.tagName ? ` (\`<${info.tagName}>\`)` : "") +
        (info.html ? `\n\nAktualny HTML:\n\`\`\`html\n${info.html}\n\`\`\`` : "") +
        "\n\nOpisz dokladnie, co chcesz tam zmienic.";
    } else {
      hint =
        `Zmien element w obszarze podgladu w okolicy (x:${info.x}px, y:${info.y}px). ` +
        "Opisz dokladnie, co chcesz tam dodac, zmienic lub usunac.";
    }
    chatRef.current?.appendHint(hint);
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <ProjectTopbar
        project={project}
        rootDomain={rootDomain}
        publishDomain={publishDomain}
        appUrl={appUrl}
        domainPartnerUrl={domainPartnerUrl}
      />

      {/*
        Layout responsywny — JEDEN ChatPanel w grid.
        Mobile: chat na gorze (40vh), canvas pod nim.
        Desktop: chat po lewej (420px), canvas po prawej.
      */}
      <div
        className="
          grid min-h-0 flex-1
          grid-cols-1 grid-rows-[40vh_1fr]
          lg:grid-cols-[420px_1fr] lg:grid-rows-1
        "
      >
        <div className="min-h-0 border-b border-beige/10 lg:border-b-0 lg:border-r">
          <ChatPanel
            ref={chatRef}
            projectId={project.id}
            initialPrompt={project.prompt}
            initialMessages={initialMessages}
            hasFiles={hasFiles}
            selectMode={selectMode}
            onSelectModeChange={setSelectMode}
          />
        </div>

        <div className="min-h-0">
          <WorkspaceCanvas
            project={project}
            publishDomain={publishDomain}
            selectMode={selectMode}
            onElementPick={handleElementPick}
            onFixError={(hint) => chatRef.current?.appendHint(hint)}
          />
        </div>
      </div>
    </div>
  );
}
