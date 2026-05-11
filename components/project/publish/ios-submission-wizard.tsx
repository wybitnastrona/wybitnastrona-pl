"use client";

/**
 * iOS Submission Wizard (3 stepy: Details → Build → Review).
 *
 * Faza 10 — UI tylko, wszystkie API calls do `/api/submissions/...` w Phase 11.
 */

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  Send,
  Settings,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppleCredentialsDialog } from "./apple-credentials-dialog";
import { SubmissionTracker } from "./submission-tracker";

type Step = "details" | "build" | "review";

type Props = {
  projectId: string;
  /**
   * Domyslne wartosci (np. z poprzedniej submission). Pomijaj dla freshow.
   */
  defaults?: Partial<{
    appName: string;
    bundleId: string;
    version: string;
    buildNumber: number;
    category: string;
    description: string;
    keywords: string[];
  }>;
};

export function IosSubmissionWizard({ projectId, defaults }: Props) {
  const [step, setStep] = useState<Step>("details");
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // ─── Step 1 fields ─────────────────────────────────────────────────────────
  const [appName, setAppName] = useState(defaults?.appName ?? "");
  const [bundleId, setBundleId] = useState(
    defaults?.bundleId ?? "pl.wybitnastrona.app",
  );
  const [version, setVersion] = useState(defaults?.version ?? "1.0.0");
  const [buildNumber, setBuildNumber] = useState(defaults?.buildNumber ?? 1);
  const [category, setCategory] = useState(defaults?.category ?? "PRODUCTIVITY");
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [keywordsRaw, setKeywordsRaw] = useState(
    (defaults?.keywords ?? []).join(", "),
  );

  // ─── Step 2 fields ─────────────────────────────────────────────────────────
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentialsId, setCredentialsId] = useState<string | null>(null);
  const [destination, setDestination] = useState<"testflight" | "appstore">(
    "testflight",
  );

  // ─── Submit ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveDraft(): Promise<string | null> {
    const keywords = keywordsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/submissions", {
      method: submissionId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: submissionId,
        project_id: projectId,
        platform: "ios",
        status: "draft",
        app_name: appName,
        bundle_id: bundleId,
        version,
        build_number: buildNumber,
        category,
        description,
        keywords,
      }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    if (!res.ok || !data.id) {
      setError(data.error ?? "Zapis nieudany");
      return null;
    }
    setSubmissionId(data.id);
    return data.id;
  }

  async function handleNextFromDetails() {
    setError(null);
    if (!appName || !bundleId || !version) {
      setError("Nazwa aplikacji, Bundle ID i wersja sa wymagane.");
      return;
    }
    const id = await saveDraft();
    if (id) setStep("build");
  }

  async function handleStartBuild() {
    setError(null);
    if (!credentialsId) {
      setError("Wybierz lub dodaj klucz App Store Connect.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials_id: credentialsId,
          destination,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Nie udalo sie uruchomic buildu.");
      } else {
        setStep("review");
      }
    } catch (err) {
      console.error(err);
      setError("Blad sieci");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-beige/10 bg-card/40 p-6">
      <Stepper current={step} />

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Step 1: Details (Screen 7) */}
      {step === "details" && (
        <section className="flex flex-col gap-4">
          <header className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-beige" />
            <h3 className="text-base font-medium">Krok 1 — Szczegoly aplikacji</h3>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ios-name">Nazwa aplikacji</Label>
              <Input
                id="ios-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Wybitna App"
                maxLength={30}
              />
              <p className="text-[10px] text-muted-foreground">
                Max 30 znakow. Bez emoji.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ios-bundle">Bundle ID</Label>
              <Input
                id="ios-bundle"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                placeholder="pl.wybitnastrona.app"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ios-category">Kategoria</Label>
              <select
                id="ios-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-md border border-beige/15 bg-background/60 px-3 text-sm text-foreground"
              >
                <option value="PRODUCTIVITY">Productivity</option>
                <option value="HEALTH_AND_FITNESS">Health & Fitness</option>
                <option value="FINANCE">Finance</option>
                <option value="EDUCATION">Education</option>
                <option value="LIFESTYLE">Lifestyle</option>
                <option value="GAMES">Games</option>
                <option value="UTILITIES">Utilities</option>
                <option value="ENTERTAINMENT">Entertainment</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ios-version">Version</Label>
              <Input
                id="ios-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ios-build">Build number</Label>
              <Input
                id="ios-build"
                type="number"
                value={buildNumber}
                onChange={(e) => setBuildNumber(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ios-desc">Opis (App Store description)</Label>
              <textarea
                id="ios-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Krotki opis aplikacji (max 4000 znakow)"
                rows={4}
                maxLength={4000}
                className="rounded-md border border-beige/15 bg-background/60 px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ios-keys">Slowa kluczowe (rozdzielone przecinkiem)</Label>
              <Input
                id="ios-keys"
                value={keywordsRaw}
                onChange={(e) => setKeywordsRaw(e.target.value)}
                placeholder="trener, zdrowie, fitness"
              />
              <p className="text-[10px] text-muted-foreground">
                Max 100 znakow lacznie. Bez spacji po przecinkach.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={handleNextFromDetails}
              className="bg-beige text-beige-foreground hover:bg-beige/90"
            >
              Dalej
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Step 2: Build (Screen 8) */}
      {step === "build" && (
        <section className="flex flex-col gap-4">
          <header className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-beige" />
            <h3 className="text-base font-medium">Krok 2 — Build & podpis</h3>
          </header>

          <div className="flex flex-col gap-3">
            <Label>Klucz App Store Connect</Label>
            <button
              type="button"
              onClick={() => setCredentialsOpen(true)}
              className="flex h-10 cursor-pointer items-center justify-between gap-2 rounded-md border border-beige/15 bg-background/40 px-3 text-sm text-foreground/85 transition hover:border-beige/30"
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-beige/70" />
                {credentialsId ? "Klucz wybrany" : "Wybierz lub dodaj klucz ASC"}
              </span>
              {credentialsId ? (
                <Check className="h-3.5 w-3.5 text-beige" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <Label>Cel publikacji</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["testflight", "appstore"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDestination(d)}
                  className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition ${
                    destination === d
                      ? "border-beige/50 bg-beige/10"
                      : "border-beige/15 bg-background/40 hover:border-beige/30"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">
                    {d === "testflight" ? "TestFlight" : "App Store"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {d === "testflight"
                      ? "Beta testers, do 10 000 uzytkownikow"
                      : "Publikacja w App Store po recenzji"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => setStep("details")}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Wstecz
            </Button>
            <Button
              onClick={handleStartBuild}
              disabled={submitting || !credentialsId}
              className="bg-beige text-beige-foreground hover:bg-beige/90"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Uruchom build
            </Button>
          </div>
        </section>
      )}

      {/* Step 3: Review (Screen 9) */}
      {step === "review" && submissionId && (
        <section className="flex flex-col gap-4">
          <header className="flex items-center gap-2">
            <Send className="h-4 w-4 text-beige" />
            <h3 className="text-base font-medium">Krok 3 — Tracking & weryfikacja</h3>
          </header>

          <p className="text-sm text-muted-foreground">
            Build uruchomiony. Status odswieza sie na zywo (Codemagic webhook + Supabase Realtime).
          </p>

          <SubmissionTracker submissionId={submissionId} />
        </section>
      )}

      <AppleCredentialsDialog
        open={credentialsOpen}
        onOpenChange={setCredentialsOpen}
        onSaved={(id) => setCredentialsId(id)}
      />
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "build", label: "Build" },
    { key: "review", label: "Review" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const reached = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                reached
                  ? "border-beige/50 bg-beige/15 text-beige"
                  : "border-beige/15 bg-background/40 text-muted-foreground"
              }`}
            >
              {isCurrent || !reached ? i + 1 : <Check className="h-3 w-3" />}
            </span>
            <span
              className={`text-xs ${reached ? "text-foreground" : "text-muted-foreground"}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="ml-1 h-px flex-1 bg-beige/10" />
            )}
          </div>
        );
      })}
    </div>
  );
}
