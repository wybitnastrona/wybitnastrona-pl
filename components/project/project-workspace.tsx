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
  // Starter vite-react ma teraz wiele widocznych plikow konfiguracji
  // (Bolt-style: package.json, vite.config, tsconfig.*, tailwind.config,
  // /.wybitna/*, /public/images/*). Te NIE liczą się jako "projekt ma pliki"
  // — nas interesują tylko PLIKI WYGENEROWANE PRZEZ AI (sekcje, layout, pages).
  // Bez tej heurystyki świeży projekt natychmiast widzi `hasFiles=true` i
  // wizard z pytaniami nie wystartuje.
  const AI_GENERATED_PATTERNS = [
    /^\/src\/components\/sections\//,
    /^\/src\/components\/layout\//,
    /^\/src\/pages\//,
    /^\/src\/data\//,
  ];
  const aiGeneratedCount = Object.keys(project.files ?? {}).filter((path) =>
    AI_GENERATED_PATTERNS.some((re) => re.test(path)),
  ).length;
  const hasFiles = aiGeneratedCount >= 2;

  const hasStoredHistory = initialMessages.length > 0;

  // Show wizard for brand-new projects only.
  const [wizardActive, setWizardActive] = useState(
    !hasFiles && !hasStoredHistory,
  );

  const [selectMode, setSelectMode] = useState(false);
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT);
  const [streaming, setStreaming] = useState(false);
  const [chatMode, setChatMode] = useState<"build" | "plan" | "discuss">(
    initialMode ?? "build",
  );
  const chatRef = useRef<ChatPanelHandle>(null);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const handleFixError = useCallback(
    (hint: string, opts: { auto: boolean }) => {
      if (opts.auto) {
        chatRef.current?.submitHint(hint);
      } else {
        chatRef.current?.appendHint(hint);
      }
    },
    [],
  );

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: chatWidth };

    // Blokujemy iframe pointer-events + ustawiamy globalny kursor, zeby drag
    // nie zrywal sie gdy mysz wjedzie na WebContainer iframe / DevTools.
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((f) => {
      (f as HTMLElement).style.pointerEvents = "none";
    });

    function onMove(mv: MouseEvent) {
      if (!dragRef.current) return;
      const delta = mv.clientX - dragRef.current.startX;
      const next = Math.min(CHAT_MAX, Math.max(CHAT_MIN, dragRef.current.startW + delta));
      setChatWidth(next);
    }
    function onUp() {
      dragRef.current = null;
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      iframes.forEach((f) => {
        (f as HTMLElement).style.pointerEvents = "";
      });
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
    // Cursor-style: zamiast wpisywac tekst do textarea, doczepiamy element
    // jako "chip" obok pola. Tresc wleci do wiadomosci dopiero przy submit.
    chatRef.current?.attachElement({
      selector: info.selector,
      html: info.html,
      tagName: info.tagName,
      x: info.x,
      y: info.y,
    });
  }

  function handleWizardComplete(enrichedPrompt: string) {
    // ChatPanel is always mounted (just hidden), so chatRef.current is available
    // synchronously here — no setTimeout needed. Setting startedRef inside
    // startWithPlanPrompt BEFORE setWizardActive prevents the auto-start
    // useEffect from firing a duplicate request when wizardBlocked flips.
    chatRef.current?.startWithPlanPrompt(enrichedPrompt);
    setWizardActive(false);
  }

  function handleWizardSkip() {
    setWizardActive(false);
    // Auto-start useEffect fires naturally now that wizardBlocked=false
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
        <div className="relative min-h-0 border-b border-beige/10 lg:border-b-0">
          {/* Wizard overlays the chat panel while active. ChatPanel stays mounted
              so chatRef.current is available synchronously in handleWizardComplete,
              preventing the auto-start race condition. */}
          {wizardActive && (
            <div className="absolute inset-0 z-10 bg-background">
              <WizardPanel
                initialPrompt={project.prompt}
                onComplete={handleWizardComplete}
                onSkip={handleWizardSkip}
              />
            </div>
          )}
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
            wizardBlocked={wizardActive}
            onStreamingChange={setStreaming}
            onModeChange={setChatMode}
          />
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
            onFixError={handleFixError}
            isStreaming={streaming}
            chatMode={chatMode}
            hasFiles={hasFiles}
            onActivatePreviewPickMode={() => setSelectMode(true)}
          />
        </div>
      </div>
    </div>
  );
}
