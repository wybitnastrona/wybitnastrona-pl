"use client";

import { useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ProjectTopbar } from "@/components/project/project-topbar";
import {
  ChatPanel,
  type ChatPanelHandle,
} from "@/components/project/chat-panel";
import { WizardPanel } from "@/components/project/wizard-panel";
import { WorkspaceCanvas } from "@/components/project/workspace-canvas";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
  initialMessages: UIMessage[];
  rootDomain: string;
  publishDomain: string;
  appUrl: string;
  domainPartnerUrl: string;
  initialModel?: string;
  initialMode?: "build" | "plan";
};

export function ProjectWorkspace({
  project,
  initialMessages,
  rootDomain,
  publishDomain,
  appUrl,
  domainPartnerUrl,
  initialModel,
  initialMode,
}: Props) {
  const hasFiles =
    Object.keys(project.files ?? {}).filter(
      (key) => !["/index.html", "/index.tsx"].includes(key),
    ).length > 1;

  const hasStoredHistory = initialMessages.length > 0;

  // Show wizard for brand-new projects only.
  const [wizardActive, setWizardActive] = useState(
    !hasFiles && !hasStoredHistory,
  );

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

  function handleWizardComplete(enrichedPrompt: string) {
    setWizardActive(false);
    // Give React one tick to un-block the ChatPanel before sending
    setTimeout(() => {
      chatRef.current?.startWithPrompt(enrichedPrompt);
    }, 0);
  }

  function handleWizardSkip() {
    setWizardActive(false);
    // Auto-start will kick in now that wizardBlocked=false
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

      <div
        className="
          grid min-h-0 flex-1
          grid-cols-1 grid-rows-[40vh_1fr]
          lg:grid-cols-[420px_1fr] lg:grid-rows-1
        "
      >
        <div className="min-h-0 border-b border-beige/10 lg:border-b-0 lg:border-r">
          {wizardActive ? (
            <WizardPanel
              initialPrompt={project.prompt}
              onComplete={handleWizardComplete}
              onSkip={handleWizardSkip}
            />
          ) : (
            <ChatPanel
              ref={chatRef}
              projectId={project.id}
              initialPrompt={project.prompt}
              initialMessages={initialMessages}
              hasFiles={hasFiles}
              selectMode={selectMode}
              onSelectModeChange={setSelectMode}
              initialModel={initialModel}
              initialMode={initialMode}
              wizardBlocked={false}
            />
          )}
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
