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

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/types/project";

type Props = {
  project: Project;
};

export function StripePanel({ project }: Props) {
  const router = useRouter();
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

  const isConfigured = Boolean(
    (project as Project & { stripe_publishable_key?: string }).stripe_publishable_key,
  );

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
