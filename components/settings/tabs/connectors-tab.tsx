"use client";

/**
 * ConnectorsTab - zarządzanie integracji MCP (Model Context Protocol).
 *
 * Umożliwia dodawanie i usuwanie kluczy API dla:
 *  - Notion (notatki, bazy danych)
 *  - Linear (issue tracker)
 *  - GitHub (repozytoria)
 *  - Własny serwer MCP (custom URL)
 *
 * Dane zapisywane są w tabeli `user_integration_credentials` (RLS owner-only).
 */

import { useState, useEffect } from "react";
import { CheckCircle2, ExternalLink, Loader2, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConnectorDef = {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  initials: string;
  accentColor: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenHelpUrl: string;
  tokenHelpText: string;
  /** Provider value stored in user_integration_credentials */
  provider: "notion" | "linear" | "custom_mcp";
  /** Dodatkowe pole (dla custom MCP: URL) */
  extraField?: { label: string; key: string; placeholder: string };
};

const CONNECTORS: ConnectorDef[] = [
  {
    id: "notion",
    name: "Notion",
    description: "Notatki, bazy danych i dokumentacja. AI może odczytywać i edytować Twoje Notion pages.",
    docsUrl: "https://developers.notion.com/docs/authorization",
    initials: "N",
    accentColor: "#fff",
    tokenLabel: "Notion Internal Integration Token",
    tokenPlaceholder: "secret_...",
    tokenHelpUrl: "https://www.notion.so/my-integrations",
    tokenHelpText: "Utwórz integrację na notion.so/my-integrations → Internal Integration",
    provider: "notion",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issue tracker i zarządzanie projektami. AI może tworzyć i śledzić zadania.",
    docsUrl: "https://developers.linear.app/docs/graphql/working-with-the-graphql-api",
    initials: "L",
    accentColor: "#5e6ad2",
    tokenLabel: "Linear Personal API Key",
    tokenPlaceholder: "lin_api_...",
    tokenHelpUrl: "https://linear.app/settings/api",
    tokenHelpText: "Settings → API → Personal API Keys",
    provider: "linear",
  },
  {
    id: "custom",
    name: "Własny serwer MCP",
    description: "Połącz dowolny zdalny serwer MCP z własnym URL i konfiguracją.",
    docsUrl: "https://modelcontextprotocol.io/introduction",
    initials: "+",
    accentColor: "#e8dcc4",
    tokenLabel: "API Key / Bearer Token (opcjonalny)",
    tokenPlaceholder: "Bearer sk_...",
    tokenHelpUrl: "https://modelcontextprotocol.io",
    tokenHelpText: "Serwer musi implementować protokół MCP (SSE lub HTTP).",
    provider: "custom_mcp",
    extraField: { label: "URL serwera MCP", key: "url", placeholder: "https://mcp.mojadomena.pl/sse" },
  },
];

type SavedCredential = {
  id: string;
  provider: string;
  display_name: string;
  created_at: string;
};

export function ConnectorsTab() {
  const [saved, setSaved] = useState<SavedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConnector, setActiveConnector] = useState<string | null>(null);

  useEffect(() => {
    void fetchSaved();
  }, []);

  async function fetchSaved() {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_integration_credentials")
      .select("id, provider, display_name, created_at")
      .in("provider", ["notion", "linear", "custom_mcp"]);
    setSaved(data ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("user_integration_credentials").delete().eq("id", id);
    setSaved((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">Konektory (MCP)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Połącz zewnętrzne narzędzia z asystentem AI. Dodane klucze są zapisywane
          bezpiecznie (RLS) i dostępne tylko dla Ciebie.
        </p>
      </header>

      {/* Zapisane klucze */}
      {!loading && saved.length > 0 && (
        <section>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Podpięte integracje</p>
          <div className="space-y-2">
            {saved.map((cred) => {
              const def = CONNECTORS.find((c) => c.provider === cred.provider);
              return (
                <div
                  key={cred.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-950/10 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-sm text-foreground">{def?.name ?? cred.provider}</span>
                    <span className="text-xs text-muted-foreground">· {cred.display_name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(cred.id)}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-white/5 hover:text-rose-400"
                    title="Usuń integrację"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lista dostępnych konektorów */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {CONNECTORS.map((connector) => {
          const isConnected = saved.some((c) => c.provider === connector.provider);
          const isActive = activeConnector === connector.id;
          return (
            <div key={connector.id} className="flex flex-col gap-2">
              <article
                className={`flex cursor-pointer flex-col rounded-lg border p-3 transition ${
                  isActive
                    ? "border-beige/50 bg-card"
                    : isConnected
                      ? "border-emerald-500/20 bg-emerald-950/10"
                      : "border-beige/15 bg-background/40 hover:border-beige/30 hover:bg-background/60"
                }`}
                onClick={() => setActiveConnector(isActive ? null : connector.id)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-beige/20 text-sm font-semibold"
                    style={{ backgroundColor: connector.id === "custom" ? "transparent" : connector.accentColor + "22", color: connector.accentColor }}
                  >
                    {connector.id === "custom" ? <Plus className="h-4 w-4" /> : connector.initials}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{connector.name}</p>
                    {isConnected && (
                      <span className="text-[10px] text-emerald-400">● Podłączono</span>
                    )}
                  </div>
                  <a
                    href={connector.docsUrl}
                    target="_blank"
                    rel="noopener"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-beige"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{connector.description}</p>
              </article>

              {isActive && (
                <ConnectorForm
                  connector={connector}
                  onSaved={() => {
                    void fetchSaved();
                    setActiveConnector(null);
                  }}
                  onCancel={() => setActiveConnector(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectorForm({
  connector,
  onSaved,
  onCancel,
}: {
  connector: ConnectorDef;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [token, setToken] = useState("");
  const [extraValue, setExtraValue] = useState("");
  const [displayName, setDisplayName] = useState(connector.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!token && !extraValue) {
      setError("Wprowadź przynajmniej jeden klucz lub URL.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const payload: Record<string, string | undefined> = {
        provider: connector.provider,
        display_name: displayName || connector.name,
      };
      if (connector.provider === "notion") payload.notion_token = token;
      if (connector.provider === "linear") payload.linear_api_key = token;
      if (connector.provider === "custom_mcp") {
        payload.custom_mcp_url = extraValue;
        if (token) payload.codemagic_token = token;
      }

      const { error: dbErr } = await supabase
        .from("user_integration_credentials")
        .insert(payload);
      if (dbErr) { setError(dbErr.message); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-beige/25 bg-card/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">Konfiguracja - {connector.name}</p>
        <button type="button" onClick={onCancel} className="cursor-pointer text-muted-foreground hover:text-beige">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Nazwa wyświetlana</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 h-8 text-xs" />
        </div>

        {connector.extraField && (
          <div>
            <Label className="text-[11px] text-muted-foreground">{connector.extraField.label}</Label>
            <Input
              value={extraValue}
              onChange={(e) => setExtraValue(e.target.value)}
              placeholder={connector.extraField.placeholder}
              className="mt-1 h-8 text-xs font-mono"
            />
          </div>
        )}

        <div>
          <Label className="text-[11px] text-muted-foreground">
            {connector.tokenLabel}{" "}
            <a href={connector.tokenHelpUrl} target="_blank" rel="noopener" className="text-beige/70 hover:text-beige">
              (jak zdobyć?)
            </a>
          </Label>
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={connector.tokenPlaceholder}
            className="mt-1 h-8 text-xs font-mono"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">{connector.tokenHelpText}</p>
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full bg-beige text-beige-foreground hover:bg-beige/90">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Zapisz integrację
        </Button>
      </div>
    </div>
  );
}
