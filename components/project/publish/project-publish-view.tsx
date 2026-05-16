"use client";

/**
 * Project Publish View (Screen 6).
 *
 * Pokazywany po kliknieciu "Opublikuj" dla projektów mobilnych:
 *  - iOS: lista poprzednich submission + przycisk "New Submission" otwierajacy iOS Wizard.
 *  - Android: AndroidOptionsPanel od razu.
 *  - watchOS / tvOS / visionOS: jak iOS.
 *
 * Dla web: zwykla publikacja przez `/api/projects/[id]/publish` (juz istnieje w project-topbar).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IosSubmissionWizard } from "./ios-submission-wizard";
import { AndroidOptionsPanel } from "./android-options-panel";
import { SubmissionTracker } from "./submission-tracker";
import { AppleIcon, AndroidIcon } from "@/components/brand-icons";

type Submission = {
  id: string;
  platform: "ios" | "android";
  status: string;
  app_name: string | null;
  version: string | null;
  build_number: number | null;
  testflight_url: string | null;
  app_store_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  projectId: string;
  /** Project mode: ios / android / watchos / tvos / visionos */
  platform: "ios" | "android" | "watchos" | "tvos" | "visionos";
};

export function ProjectPublishView({ projectId, platform }: Props) {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    null,
  );

  // Ostatnia ref do fetcha - uzywany w handlerach (np. po sukcesie android submit).
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/submissions?projectId=${encodeURIComponent(projectId)}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { submissions: Submission[] };
        if (!cancelled) setSubmissions(data.submissions);
      } catch (err) {
        console.error(err);
      }
    }

    refreshRef.current = () => {
      void load();
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const fetchSubmissions = useCallback(() => {
    refreshRef.current();
  }, []);

  const isApplePlatform =
    platform === "ios" ||
    platform === "watchos" ||
    platform === "tvos" ||
    platform === "visionos";
  const PlatformIcon = isApplePlatform ? AppleIcon : AndroidIcon;
  const platformLabel = isApplePlatform ? "Apple" : "Google Play";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3 border-b border-beige/10 pb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon className="h-5 w-5 text-beige" />
          <h2 className="text-lg font-medium">
            Publikacja do {platformLabel}
          </h2>
        </div>
        {!showNew && (
          <Button
            onClick={() => setShowNew(true)}
            className="bg-beige text-beige-foreground hover:bg-beige/90"
          >
            <Plus className="h-4 w-4" />
            Nowa submission
          </Button>
        )}
      </header>

      {/* Active submission tracker - gdy użytkownik kliknal poprzednia */}
      {activeSubmissionId && !showNew && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setActiveSubmissionId(null)}
            className="self-start text-xs text-muted-foreground hover:text-beige"
          >
            ← Wroc do listy
          </button>
          <SubmissionTracker submissionId={activeSubmissionId} />
        </div>
      )}

      {/* New submission flow */}
      {showNew && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="self-start text-xs text-muted-foreground hover:text-beige"
          >
            ← Anuluj
          </button>
          {isApplePlatform ? (
            <IosSubmissionWizard projectId={projectId} />
          ) : (
            <AndroidOptionsPanel
              projectId={projectId}
              onSubmitted={(id) => {
                setShowNew(false);
                setActiveSubmissionId(id);
                void fetchSubmissions();
              }}
            />
          )}
        </div>
      )}

      {/* Lista poprzednich submission */}
      {!showNew && !activeSubmissionId && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-foreground">
            Poprzednie submissions
          </h3>
          {!submissions ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pobieram historie...
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-beige/20 bg-card/40 p-8 text-center">
              <Smartphone className="h-6 w-6 text-beige/60" />
              <p className="text-sm text-foreground">Brak submission</p>
              <p className="text-xs text-muted-foreground">
                Kliknij &ldquo;Nowa submission&rdquo; aby rozpoczac wysylke.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {submissions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSubmissionId(s.id)}
                  className="group flex items-center gap-3 rounded-xl border border-beige/15 bg-card/40 px-4 py-3 text-left transition hover:border-beige/30"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beige/10">
                    {s.status === "submitted" || s.status === "uploaded" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : s.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-beige" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {s.app_name ?? "Untitled"} {s.version ?? ""}
                      {s.build_number ? ` (${s.build_number})` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Status: {s.status} • {new Date(s.updated_at).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  {(s.testflight_url || s.app_store_url) && (
                    <ExternalLink className="h-3.5 w-3.5 text-beige/70 transition group-hover:text-beige" />
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
