"use client";

/**
 * Stripe Integration Panel — klient podpina swoje konto Stripe.
 *
 * Pozwala na:
 *  - Wpisanie klucza publicznego (pk_live_ lub pk_test_)
 *  - Wpisanie klucza prywatnego (sk_live_ — szyfrowany przed zapisem)
 *  - Wpisanie Webhook Secret
 *  - Podglad statusu integracji
 *
 * Po zapisaniu AI bedzie mogl generowac kod z prawdziwymi kluczami Stripe.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  ExternalLink,
  Link2,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Unplug,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
};

type StripeIntegration = {
  provider: "stripe";
  config?: {
    access_token?: string;
    stripe_user_id?: string;
    livemode?: boolean;
    scope?: string;
  };
  created_at?: string;
  updated_at?: string;
};

export function StripePanel({ project }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [publishableKey, setPublishableKey] = useState(
    (project as Project & { stripe_publishable_key?: string }).stripe_publishable_key ?? "",
  );
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectIntegration, setConnectIntegration] = useState<StripeIntegration | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConfigured = Boolean(
    (project as Project & { stripe_publishable_key?: string }).stripe_publishable_key,
  );
  const isConnectActive = Boolean(connectIntegration?.config?.stripe_user_id);

  useEffect(() => {
    let cancelled = false;
    async function loadIntegration() {
      try {
        const res = await fetch("/api/integrations/stripe", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as
          | { integration: StripeIntegration | null }
          | null;
        if (!cancelled) setConnectIntegration(data?.integration ?? null);
      } finally {
        if (!cancelled) setConnectLoading(false);
      }
    }
    loadIntegration();
    return () => {
      cancelled = true;
    };
  }, []);

  // Po powrocie z OAuth Stripe — odswiez status (callback dodaje ?stripe_connected=1).
  useEffect(() => {
    if (searchParams.get("stripe_connected") === "1") {
      router.refresh();
    }
  }, [searchParams, router]);

  function startConnectOAuth() {
    window.location.href = `/api/integrations/stripe/connect?projectId=${encodeURIComponent(project.id)}`;
  }

  async function disconnectStripe() {
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/stripe", { method: "DELETE" });
      setConnectIntegration(null);
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!publishableKey.startsWith("pk_")) {
      setError('Klucz publiczny musi zaczynać się od "pk_"');
      return;
    }
    if (secretKey && !secretKey.startsWith("sk_")) {
      setError('Klucz prywatny musi zaczynać się od "sk_"');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/stripe`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishableKey: publishableKey.trim() || null,
          secretKey: secretKey.trim() || null,
          webhookSecret: webhookSecret.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Nie udało się zapisać konfiguracji Stripe");
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("pl-PL"));
      if (secretKey) setSecretKey("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}/stripe`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishableKey: null,
          secretKey: null,
          webhookSecret: null,
        }),
      });
      setPublishableKey("");
      setSecretKey("");
      setWebhookSecret("");
      setSavedAt(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* ────────────────────────────────────────────────────────────────────────
          Stripe Connect (OAuth) — preferowana sciezka.
          Pozwala AI automatycznie tworzyc produkty + ceny na koncie usera.
         ──────────────────────────────────────────────────────────────────────── */}
      <section
        className={`rounded-xl border p-4 ${
          isConnectActive
            ? "border-violet-500/30 bg-violet-950/15"
            : "border-beige/15 bg-beige/[0.04]"
        }`}
      >
        <header className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isConnectActive
                ? "bg-violet-500/20 text-violet-300"
                : "bg-beige/15 text-beige"
            }`}
          >
            {isConnectActive ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">
                Wybitne Płatności (Stripe Connect)
              </h3>
              {isConnectActive ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Aktywne
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-beige/20 bg-beige/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Zalecane
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isConnectActive
                ? "Twoje konto Stripe jest podpięte. AI może tworzyć produkty i ceny bezpośrednio na Twoim koncie."
                : "Podepnij swoje konto Stripe jednym kliknięciem. AI samo utworzy produkty, ceny i Checkout dla generowanej strony."}
            </p>
            {isConnectActive && connectIntegration?.config?.stripe_user_id && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                {connectIntegration.config.stripe_user_id}
                {connectIntegration.config.livemode === false && " · test mode"}
              </p>
            )}
          </div>
        </header>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {connectLoading ? (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sprawdzam status integracji…
            </div>
          ) : isConnectActive ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={startConnectOAuth}
                className="border-beige/20 bg-beige/10 text-beige hover:bg-beige/15"
              >
                <Link2 className="h-3.5 w-3.5" />
                Zmień konto Stripe
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={disconnectStripe}
                disabled={disconnecting}
                className="text-muted-foreground hover:text-rose-400"
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5" />
                )}
                Odłącz
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={startConnectOAuth}
              className="bg-[#635bff] text-white hover:bg-[#5851e6]"
            >
              <Link2 className="h-3.5 w-3.5" />
              Połącz przez Stripe Connect
            </Button>
          )}
          <a
            href="https://stripe.com/connect"
            target="_blank"
            rel="noopener"
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Co to jest Connect?
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </section>

      {/* Klucze ręczne — pozostają jako alternatywa */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-beige/10" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          Lub: klucze ręczne (alternatywa)
        </span>
        <div className="h-px flex-1 bg-beige/10" />
      </div>

      {/* Status banner */}
      <div
        className={`flex items-start gap-3 rounded-xl border p-3 ${
          isConfigured
            ? "border-emerald-500/20 bg-emerald-950/20"
            : "border-beige/10 bg-card/40"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isConfigured ? "bg-emerald-500/15 text-emerald-400" : "bg-beige/10 text-beige/60"
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {isConfigured ? "Stripe skonfigurowany" : "Stripe nie skonfigurowany"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isConfigured
              ? "AI może generować kod z płatnościami Stripe dla tej strony."
              : "Podpnij swoje konto Stripe aby AI mogło generować kod z płatnościami."}
          </p>
        </div>
      </div>

      {/* Jak to działa */}
      <div className="rounded-xl border border-beige/10 bg-card/20 p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Jak to działa
        </p>
        <ul className="space-y-1.5 text-[12px] text-muted-foreground">
          <li className="flex items-start gap-2">
            <Zap className="mt-0.5 h-3 w-3 shrink-0 text-beige/70" />
            AI wygeneruje kod z Twoimi kluczami Stripe — gotowy do przyjmowania płatności.
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-beige/70" />
            Klucz prywatny jest szyfrowany i nigdy nie trafia do wygenerowanego kodu frontendu.
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-beige/70" />
            Możesz użyć trybu testowego (pk_test_ / sk_test_) do weryfikacji przed live.
          </li>
        </ul>
      </div>

      {/* Formularz */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stripe-pk" className="flex items-center gap-1.5">
            Klucz publiczny (Publishable Key)
            <span className="text-[10px] text-muted-foreground">wymagany</span>
          </Label>
          <Input
            id="stripe-pk"
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            placeholder="pk_live_... lub pk_test_..."
            autoComplete="off"
          />
          <p className="text-[10px] text-muted-foreground">
            Dostępny w{" "}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-0.5 text-beige/80 hover:text-beige"
            >
              Stripe Dashboard → API Keys
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stripe-sk" className="flex items-center gap-1.5">
            Klucz prywatny (Secret Key)
            <span className="text-[10px] text-muted-foreground">opcjonalny — do API backendu</span>
          </Label>
          <div className="relative">
            <Input
              id="stripe-sk"
              type={showSecretKey ? "text" : "password"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="sk_live_... lub sk_test_... (wprowadź aby zaktualizować)"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowSecretKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              {showSecretKey ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Używany po stronie serwera do tworzenia PaymentIntent. Szyfrowany przed zapisem.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stripe-wh" className="flex items-center gap-1.5">
            Webhook Signing Secret
            <span className="text-[10px] text-muted-foreground">opcjonalny</span>
          </Label>
          <div className="relative">
            <Input
              id="stripe-wh"
              type={showWebhookSecret ? "text" : "password"}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowWebhookSecret((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              {showWebhookSecret ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {savedAt && (
        <p className="text-xs text-emerald-400">✓ Zapisano o {savedAt}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        {isConfigured && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={saving}
            className="text-muted-foreground hover:text-rose-400"
          >
            Usuń integrację
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !publishableKey.trim()}
          className="ml-auto bg-beige text-beige-foreground hover:bg-beige/90"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Zapisz konfigurację Stripe
        </Button>
      </div>
    </div>
  );
}
