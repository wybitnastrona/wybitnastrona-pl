"use client";

/**
 * IntegrationsPanel — UI do konfiguracji integracji MCP (Supabase / Notion /
 * Memory / Stitch). Renderowany w CreationHero (przycisk "Integracje") oraz w
 * workspace projektu (zakladka "Integracje" w MoreMenu).
 */

import { useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  Plug,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from "@/lib/integrations";

type IntegrationStatus = {
  provider: IntegrationProvider;
  configured: boolean;
  config: Record<string, unknown>;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const PROVIDER_ICON: Record<
  IntegrationProvider,
  (props: { className?: string }) => React.ReactElement
> = {
  supabase: (p) => <Database {...p} />,
  supabase_oauth: (p) => <Database {...p} />,
  notion: (p) => <FileText {...p} />,
  memory: (p) => <Plug {...p} />,
  stitch: (p) => <Plug {...p} />,
  stripe: (p) => <CreditCard {...p} />,
};

export function IntegrationsPanel({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<IntegrationProvider>("supabase");
  const [statuses, setStatuses] = useState<
    Record<IntegrationProvider, IntegrationStatus | null>
  >({
    supabase: null,
    supabase_oauth: null,
    notion: null,
    memory: null,
    stitch: null,
    stripe: null,
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all(
      INTEGRATION_PROVIDERS.map(async (p) => {
        try {
          const r = await fetch(`/api/integrations/${p.id}`);
          if (!r.ok) return null;
          const data = (await r.json()) as {
            integration: { config: Record<string, unknown> } | null;
          };
          return {
            provider: p.id,
            configured: !!data.integration,
            config: data.integration?.config ?? {},
          } as IntegrationStatus;
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      const next: Record<IntegrationProvider, IntegrationStatus | null> = {
        supabase: null,
        supabase_oauth: null,
        notion: null,
        memory: null,
        stitch: null,
        stripe: null,
      };
      for (const row of rows) if (row) next[row.provider] = row;
      setStatuses(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-3xl flex-col rounded-2xl border border-beige/20 bg-card shadow-2xl shadow-black/60">
        <header className="flex items-center justify-between border-b border-beige/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">Integracje</h2>
            <p className="text-xs text-muted-foreground">
              Podłącz Supabase / Notion / MCP — AI użyje konfiguracji podczas
              budowy strony.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-[400px] flex-col sm:flex-row">
          {/* Tabs */}
          <nav className="flex shrink-0 flex-row gap-1 border-b border-beige/10 p-3 sm:w-48 sm:flex-col sm:border-r sm:border-b-0">
            {INTEGRATION_PROVIDERS.map((p) => {
              const Icon = PROVIDER_ICON[p.id];
              const isActive = activeTab === p.id;
              const isConfigured = !!statuses[p.id]?.configured;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveTab(p.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs transition ${
                    isActive
                      ? "bg-beige/10 text-beige"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{p.name}</span>
                  {isConfigured && (
                    <Check className="h-3 w-3 text-emerald-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab content */}
          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            <IntegrationForm
              key={activeTab}
              provider={activeTab}
              initialConfig={statuses[activeTab]?.config ?? {}}
              isConfigured={!!statuses[activeTab]?.configured}
              onSaved={(cfg) => {
                setStatuses((prev) => ({
                  ...prev,
                  [activeTab]: {
                    provider: activeTab,
                    configured: true,
                    config: cfg,
                  },
                }));
              }}
              onRemoved={() => {
                setStatuses((prev) => ({ ...prev, [activeTab]: null }));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationForm({
  provider,
  initialConfig,
  isConfigured,
  onSaved,
  onRemoved,
}: {
  provider: IntegrationProvider;
  initialConfig: Record<string, unknown>;
  isConfigured: boolean;
  onSaved: (cfg: Record<string, unknown>) => void;
  onRemoved: () => void;
}) {
  const meta = INTEGRATION_PROVIDERS.find((p) => p.id === provider)!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Komponent remountuje sie przy zmianie provider (klucz `key={activeTab}` w
  // parent) — wiec lazy init jest jedynym potrzebnym sposobem zainicjowania.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(initialConfig)) {
      out[k] = typeof v === "string" ? v : "";
    }
    return out;
  });

  const fields = FIELDS_PER_PROVIDER[provider];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cfg: Record<string, unknown> = {};
      for (const f of fields) {
        const v = (values[f.key] ?? "").trim();
        if (v) cfg[f.key] = v;
      }
      const r = await fetch(`/api/integrations/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        setError(data.error ?? `HTTP ${r.status}`);
      } else {
        onSaved(cfg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd sieci");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const r = await fetch(`/api/integrations/${provider}`, {
        method: "DELETE",
      });
      if (r.ok) {
        setValues({});
        onRemoved();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-medium text-foreground">{meta.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
        {!meta.ready && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-100/10 px-2 py-0.5 text-[10px] text-amber-100">
            W przygotowaniu
          </div>
        )}
        {meta.id === "supabase" && (
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-beige underline-offset-4 hover:underline"
          >
            Otwórz Supabase Dashboard
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        {meta.id === "notion" && (
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-beige underline-offset-4 hover:underline"
          >
            Utwórz integration w Notion
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      <div className="space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="block text-xs">
            <span className="mb-1 inline-block text-muted-foreground">
              {f.label}
              {f.required && <span className="text-rose-400"> *</span>}
            </span>
            <input
              type={f.secret ? "password" : "text"}
              value={values[f.key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              placeholder={f.placeholder}
              autoComplete="off"
              spellCheck={false}
              className="block w-full rounded-lg border border-beige/15 bg-background/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-beige/40 focus:outline-none"
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {isConfigured && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-beige/15 px-3 text-[11px] text-muted-foreground transition hover:border-rose-400/40 hover:text-rose-200 disabled:opacity-60"
          >
            <Trash2 className="h-3 w-3" />
            Odłącz
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !meta.ready}
          className="ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-beige px-3 text-[11px] font-medium text-beige-foreground transition hover:bg-beige/90 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {isConfigured ? "Zaktualizuj" : "Połącz"}
        </button>
      </div>
    </form>
  );
}

type Field = {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  secret?: boolean;
};

const FIELDS_PER_PROVIDER: Record<IntegrationProvider, Field[]> = {
  supabase: [
    {
      key: "url",
      label: "Project URL",
      placeholder: "https://xxxxxx.supabase.co",
      required: true,
    },
    {
      key: "anon_key",
      label: "anon (public) key",
      placeholder: "eyJ…",
      required: true,
      secret: true,
    },
    {
      key: "service_role_key",
      label: "service_role key (opcjonalnie — odblokowuje auto-migracje)",
      placeholder: "eyJ…",
      secret: true,
    },
  ],
  notion: [
    {
      key: "integration_token",
      label: "Integration token",
      placeholder: "secret_…",
      required: true,
      secret: true,
    },
    {
      key: "database_id",
      label: "Database ID (opcjonalnie)",
      placeholder: "32-znakowy ID",
    },
  ],
  memory: [
    { key: "endpoint", label: "Endpoint URL (placeholder)", placeholder: "https://…" },
    { key: "api_key", label: "API key (placeholder)", placeholder: "klucz", secret: true },
  ],
  stitch: [
    { key: "endpoint", label: "Endpoint URL (placeholder)", placeholder: "https://…" },
    { key: "api_key", label: "API key (placeholder)", placeholder: "klucz", secret: true },
  ],
  supabase_oauth: [
    // OAuth — pola wypelniane automatycznie po callback. Manualne wpisywanie nie jest
    // wspierane, ale typ wymaga tablicy.
    {
      key: "access_token",
      label: "Access token (auto)",
      placeholder: "wypelnione przez OAuth",
      secret: true,
    },
  ],
  stripe: [
    // Stripe Connect — wypelniane przez OAuth callback. Manual fallback dla power-userow.
    {
      key: "stripe_user_id",
      label: "Stripe account ID (acct_…) — automat z OAuth",
      placeholder: "acct_1Nxxxxx",
    },
    {
      key: "access_token",
      label: "Access token (rk_… lub sk_… przy manualnym wpisie)",
      placeholder: "rk_live_…",
      secret: true,
    },
  ],
};
