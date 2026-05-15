/**
 * User integrations (Supabase / Notion / Memory MCP / Stitch MCP).
 *
 * Konfiguracje przechowywane w tabeli `user_integrations` (per-user, RLS).
 * Wraz z generowaniem strony, configi sa wstrzykiwane do system promptu jako
 * "Aktywne integracje" — AI moze ich uzyc (np. wygenerowac `/src/lib/supabase.ts`).
 */

export type IntegrationProvider =
  | "supabase"
  | "supabase_oauth"
  | "notion"
  | "memory"
  | "stitch"
  | "stripe";

export type SupabaseConfig = {
  url: string;
  anon_key: string;
  service_role_key?: string;
};

export type SupabaseOAuthConfig = {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
};

export type NotionConfig = {
  integration_token: string;
  database_id?: string;
};

export type MemoryConfig = {
  endpoint?: string;
  api_key?: string;
};

export type StitchConfig = {
  endpoint?: string;
  api_key?: string;
};

export type StripeConfig = {
  stripe_user_id: string;
  access_token: string;
  refresh_token?: string | null;
  publishable_key?: string | null;
  livemode?: boolean;
};

export type IntegrationConfig =
  | { provider: "supabase"; config: SupabaseConfig }
  | { provider: "supabase_oauth"; config: SupabaseOAuthConfig }
  | { provider: "notion"; config: NotionConfig }
  | { provider: "memory"; config: MemoryConfig }
  | { provider: "stitch"; config: StitchConfig }
  | { provider: "stripe"; config: StripeConfig };

export type IntegrationRow = {
  user_id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const INTEGRATION_PROVIDERS: {
  id: IntegrationProvider;
  name: string;
  description: string;
  ready: boolean;
}[] = [
  {
    id: "supabase",
    name: "Supabase",
    description:
      "Auth, Postgres, RLS, Storage, Realtime. AI doda klienta /src/lib/supabase.ts i wygeneruje migracje.",
    ready: true,
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "CMS / blog z Notion API. AI uzyje twojego integration tokena do pobrania danych w runtime.",
    ready: true,
  },
  {
    id: "memory",
    name: "Memory MCP",
    description:
      "Kontekst rozmowy zachowany miedzy generacjami. (W przygotowaniu — UI gotowe.)",
    ready: false,
  },
  {
    id: "stitch",
    name: "Stitch MCP",
    description:
      "Lacznik z dowolnym REST API. (W przygotowaniu — UI gotowe.)",
    ready: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Stripe Connect OAuth. AI moze automatycznie tworzyc produkty (z metadata.project_id) w Twoim koncie Stripe, gdy projekt to sklep.",
    ready: true,
  },
];

/**
 * Buduje fragment system promptu z aktywnymi integracjami uzytkownika.
 * Wywolane w app/api/generate/route.ts po fetchu profilu.
 */
export function buildIntegrationsPromptSection(
  rows: IntegrationRow[],
): string {
  if (!rows?.length) return "";

  const lines: string[] = ["", "AKTYWNE INTEGRACJE UZYTKOWNIKA:"];
  for (const row of rows) {
    const cfg = row.config ?? {};
    switch (row.provider) {
      case "supabase": {
        const url = (cfg as SupabaseConfig).url ?? "";
        if (!url) continue;
        lines.push(
          `- Supabase: url=${url}. Wygeneruj /src/lib/supabase.ts z createClient(); uzywaj anon_key z env (NEXT_PUBLIC_SUPABASE_*). Schema / RLS — uzyj toola setupSupabase jezeli dostepny.`,
        );
        break;
      }
      case "notion": {
        const token = (cfg as NotionConfig).integration_token;
        const db = (cfg as NotionConfig).database_id;
        if (!token) continue;
        lines.push(
          `- Notion: integration_token podany. ${db ? `database_id=${db}.` : ""} Mozesz proponowac pobieranie danych z Notion API (server-side).`,
        );
        break;
      }
      case "memory":
        lines.push("- Memory MCP: stub (UI gotowe, integracja runtime w przygotowaniu).");
        break;
      case "stitch":
        lines.push("- Stitch MCP: stub (UI gotowe, integracja runtime w przygotowaniu).");
        break;
      case "supabase_oauth":
        // Sluzy tylko do Management API (tworzenie projektow). Nie podaj w prompcie.
        break;
      case "stripe": {
        const acct = (cfg as StripeConfig).stripe_user_id;
        if (!acct) continue;
        lines.push(
          `- Stripe (Connect): konto ${acct} podpięte. Gdy projekt to sklep / ma produkty — wywolaj narzedzie syncStripeProducts z lista produktow {name, description, price_cents, image_url?}. Sync utworzy Product + Price w Stripe z metadata.project_id (porzadek per-strona w panelu Stripe usera).`,
        );
        break;
      }
    }
  }

  if (lines.length === 1) return "";
  lines.push("Gdy integracja jest aktywna, uwzglednij ja w wygenerowanym kodzie.");
  return lines.join("\n");
}
