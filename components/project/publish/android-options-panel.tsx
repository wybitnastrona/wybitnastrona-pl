"use client";

/**
 * Android Options Panel (Screen 4).
 *
 * Konfiguracja buildu Android i wysylki do Google Play Console:
 *  - Application ID, version code/name, target SDK
 *  - Keystore upload (.jks) — przechowywane w Supabase Storage 'submissions-keystores'
 *  - Play track (internal / alpha / beta / production)
 *  - ABI splits (arm64-v8a / armeabi-v7a / universal)
 *  - ProGuard / minify on/off
 *
 * Po kliknieciu "Wyslij do Play Store" → POST /api/submissions z platform=android.
 */

import { useState } from "react";
import { Loader2, Upload, Smartphone, Settings, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlayTrack = "internal" | "alpha" | "beta" | "production";

type Props = {
  projectId: string;
  defaultAppId?: string;
  defaultVersionName?: string;
  onSubmitted?: (submissionId: string) => void;
};

export function AndroidOptionsPanel({
  projectId,
  defaultAppId = "pl.wybitnastrona.app",
  defaultVersionName = "1.0.0",
  onSubmitted,
}: Props) {
  const [appId, setAppId] = useState(defaultAppId);
  const [versionName, setVersionName] = useState(defaultVersionName);
  const [versionCode, setVersionCode] = useState(1);
  const [track, setTrack] = useState<PlayTrack>("internal");
  const [minSdk, setMinSdk] = useState(26);
  const [targetSdk, setTargetSdk] = useState(34);
  const [splits, setSplits] = useState({ arm64: true, arm32: false });
  const [proguard, setProguard] = useState(true);
  const [keystoreFile, setKeystoreFile] = useState<File | null>(null);
  const [keystorePassword, setKeystorePassword] = useState("");
  const [keyAlias, setKeyAlias] = useState("");
  const [keyPassword, setKeyPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!keystoreFile && track !== "internal") {
      setError("Keystore wymagany dla wszystkich trackow poza 'internal'.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("platform", "android");
      fd.append("appId", appId);
      fd.append("versionName", versionName);
      fd.append("versionCode", String(versionCode));
      fd.append("track", track);
      fd.append("minSdk", String(minSdk));
      fd.append("targetSdk", String(targetSdk));
      fd.append("splits", JSON.stringify(splits));
      fd.append("proguard", String(proguard));
      if (keystoreFile) fd.append("keystore", keystoreFile);
      if (keystorePassword) fd.append("keystorePassword", keystorePassword);
      if (keyAlias) fd.append("keyAlias", keyAlias);
      if (keyPassword) fd.append("keyPassword", keyPassword);

      const res = await fetch("/api/submissions/android", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Nie udalo sie utworzyc submission.");
      } else {
        onSubmitted?.(data.id);
      }
    } catch (err) {
      console.error(err);
      setError("Blad sieci.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-beige/10 bg-card/40 p-6">
      <header className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-beige" />
        <h2 className="text-lg font-medium">Wysylka do Google Play</h2>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="app-id">Application ID</Label>
          <Input
            id="app-id"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="pl.wybitnastrona.app"
          />
          <p className="text-[10px] text-muted-foreground">
            Unikalny identyfikator paczki APK / AAB. Reverse domain.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="version-name">Version Name</Label>
          <Input
            id="version-name"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="1.0.0"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="version-code">Version Code</Label>
          <Input
            id="version-code"
            type="number"
            value={versionCode}
            onChange={(e) => setVersionCode(Number(e.target.value))}
            min={1}
          />
          <p className="text-[10px] text-muted-foreground">
            Liczba calkowita rosnaca z kazdym buildem.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="track">Play Track</Label>
          <select
            id="track"
            value={track}
            onChange={(e) => setTrack(e.target.value as PlayTrack)}
            className="h-9 rounded-md border border-beige/15 bg-background/60 px-3 text-sm text-foreground"
          >
            <option value="internal">Internal (zespol, max 100)</option>
            <option value="alpha">Alpha (zamkniete testy)</option>
            <option value="beta">Beta (otwarte testy)</option>
            <option value="production">Production (publikacja)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-sdk">Min SDK</Label>
          <Input
            id="min-sdk"
            type="number"
            value={minSdk}
            onChange={(e) => setMinSdk(Number(e.target.value))}
            min={21}
            max={34}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-sdk">Target SDK</Label>
          <Input
            id="target-sdk"
            type="number"
            value={targetSdk}
            onChange={(e) => setTargetSdk(Number(e.target.value))}
            min={26}
            max={34}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Settings className="h-4 w-4 text-beige/70" />
          Build options
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={splits.arm64}
            onChange={(e) => setSplits((s) => ({ ...s, arm64: e.target.checked }))}
          />
          ABI: arm64-v8a (zalecane dla nowych urzadzen)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={splits.arm32}
            onChange={(e) => setSplits((s) => ({ ...s, arm32: e.target.checked }))}
          />
          ABI: armeabi-v7a (starsze urzadzenia)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={proguard}
            onChange={(e) => setProguard(e.target.checked)}
          />
          ProGuard / R8 (minify + obfuscate)
        </label>
      </section>

      <section className="flex flex-col gap-3 border-t border-beige/10 pt-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Upload className="h-4 w-4 text-beige/70" />
          Keystore (do podpisania AAB)
        </div>
        <input
          type="file"
          accept=".jks,.keystore"
          onChange={(e) => setKeystoreFile(e.target.files?.[0] ?? null)}
          className="text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-beige/15 file:px-3 file:py-1.5 file:text-foreground/90"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            type="password"
            value={keystorePassword}
            onChange={(e) => setKeystorePassword(e.target.value)}
            placeholder="Keystore password"
          />
          <Input
            value={keyAlias}
            onChange={(e) => setKeyAlias(e.target.value)}
            placeholder="Key alias"
          />
          <Input
            type="password"
            value={keyPassword}
            onChange={(e) => setKeyPassword(e.target.value)}
            placeholder="Key password"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Plik .jks i hasla zapisujemy w Supabase Vault. Mozesz odebrac dostep w
          dowolnym momencie z Settings → Integrations.
        </p>
      </section>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-beige text-beige-foreground hover:bg-beige/90"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Wyslij do Google Play ({track})
      </Button>
    </div>
  );
}
