"use client";

import { useCallback, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ProjectTopbar } from "@/components/project/project-topbar";
import {
  ChatPanel,
  type ChatPanelHandle,
} from "@/components/project/chat-panel";
import { WizardPanel } from "@/components/project/wizard-panel";
import { WorkspaceCanvas } from "@/components/project/workspace-canvas";
import type { Project } from "@/lib/types/project";

const CHAT_MIN = 280;
const CHAT_MAX = 700;
const CHAT_DEFAULT = 420;

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
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT);
  const chatRef = useRef<ChatPanelHandle>(null);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: chatWidth };

    function onMove(mv: MouseEvent) {
      if (!dragRef.current) return;
      const delta = mv.clientX - dragRef.current.startX;
      const next = Math.min(CHAT_MAX, Math.max(CHAT_MIN, dragRef.current.startW + delta));
      setChatWidth(next);
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [chatWidth]);

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
      chatRef.current?.startWithPlanPrompt(enrichedPrompt);
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

      {/*
        Mobile: single column, 2 rows (chat on top, canvas below).
        Desktop (lg+): chat | drag-handle | canvas side by side.
        The <style> tag is a sibling — NOT inside the grid — so it doesn't
        consume a grid cell. The drag handle has display:none on mobile so it
        is also absent from the grid flow there.
      */}
      <style>{`
        .ws-grid { grid-template-columns: 1fr; grid-template-rows: 40vh 1fr; }
        @media (min-width: 1024px) {
          .ws-grid { grid-template-columns: var(--chat-w) 5px 1fr; grid-template-rows: 1fr; }
        }
      `}</style>

      <div
        className="ws-grid grid min-h-0 flex-1"
        style={{ "--chat-w": `${chatWidth}px` } as React.CSSProperties}
      >
        <div className="min-h-0 border-b border-beige/10 lg:border-b-0">
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

        {/* Drag handle — display:none on mobile so it's absent from the grid */}
        <div
          className="relative hidden cursor-col-resize lg:block"
          onMouseDown={startResize}
        >
          <div className="absolute inset-y-0 left-[2px] w-px bg-beige/10 transition-colors hover:bg-beige/40" />
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
