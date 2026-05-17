import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

type AuditRow = {
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string[];
  qual: string | null;
  with_check: string | null;
  is_unsafe: boolean;
  reason: string;
};

/**
 * GET /api/projects/[id]/security-audit
 *
 * Zwraca audyt polityk RLS dla bazy danych przypisanej do projektu.
 * Wywołuje SQL function `get_rls_audit()` (migracja 0046) przez Supabase RPC.
 *
 * Strategia źródła:
 *  - Jeśli projekt ma własną zewnętrzną bazę (`database_url` + `database_anon_key`),
 *    wywołuje RPC na niej (user musi mieć zainstalowaną funkcję u siebie).
 *  - Inaczej (Wybitna shared DB lub brak bazy) - wywołuje na shared DB.
 *
 * Zwraca: { source, rows, unsafeCount, message?, installSql? }
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const useExternal =
    !!project.database_url && !!project.database_anon_key;

  if (useExternal) {
    return await auditExternal(
      project.database_url!,
      project.database_anon_key!,
    );
  }

  return await auditShared(id);
}

async function auditExternal(
  url: string,
  anonKey: string,
): Promise<NextResponse> {
  try {
    const client = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.rpc("get_rls_audit");
    if (error) {
      // Najczęściej: brak funkcji w bazie usera. Daj instrukcję instalacji.
      const isMissing =
        /function .* does not exist/i.test(error.message) ||
        /could not find the function/i.test(error.message) ||
        error.code === "42883" ||
        error.code === "PGRST202";
      return NextResponse.json({
        source: "external",
        rows: [],
        unsafeCount: 0,
        message: isMissing
          ? "Funkcja get_rls_audit() nie jest zainstalowana w Twojej bazie Supabase. Wklej skrypt SQL poniżej w SQL Editor swojego projektu Supabase."
          : "Nie udało się odczytać polityk RLS: " + error.message,
        installSql: isMissing ? INSTALL_SQL : undefined,
      });
    }
    const rows = (data ?? []) as AuditRow[];
    return NextResponse.json({
      source: "external",
      rows,
      unsafeCount: rows.filter((r) => r.is_unsafe).length,
    });
  } catch (err) {
    return NextResponse.json({
      source: "external",
      rows: [],
      unsafeCount: 0,
      message:
        "Błąd połączenia z bazą: " +
        (err instanceof Error ? err.message : String(err)),
    });
  }
}

async function auditShared(projectId: string): Promise<NextResponse> {
  // Audyt na Wybitnej Bazie Danych (shared). Filtrujemy do tabel z prefiksem
  // używanym przez ten projekt - jest jedna instancja shared dla wszystkich.
  const url = process.env.NEXT_PUBLIC_APP_DB_URL;
  const anonKey = process.env.NEXT_PUBLIC_APP_DB_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({
      source: "shared",
      rows: [],
      unsafeCount: 0,
      message:
        "Wybitna Baza Danych nie jest skonfigurowana - audyt RLS niedostępny.",
    });
  }
  try {
    const client = createSupabaseClient(url, anonKey, {
      global: { headers: { "x-project-id": projectId } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.rpc("get_rls_audit");
    if (error) {
      return NextResponse.json({
        source: "shared",
        rows: [],
        unsafeCount: 0,
        message:
          "Nie udało się odczytać polityk RLS z Wybitnej Bazy Danych: " +
          error.message,
      });
    }
    const rows = (data ?? []) as AuditRow[];
    return NextResponse.json({
      source: "shared",
      rows,
      unsafeCount: rows.filter((r) => r.is_unsafe).length,
    });
  } catch (err) {
    return NextResponse.json({
      source: "shared",
      rows: [],
      unsafeCount: 0,
      message:
        "Błąd połączenia: " +
        (err instanceof Error ? err.message : String(err)),
    });
  }
}

const INSTALL_SQL = `-- wybitnastrona.pl - skrypt instalacji funkcji audit
-- Wklej w SQL Editor swojego projektu Supabase i kliknij Run.

create or replace function public.get_rls_audit()
  returns table (
    tablename   text,
    policyname  text,
    cmd         text,
    roles       text[],
    qual        text,
    with_check  text,
    is_unsafe   boolean,
    reason      text
  )
  language sql
  stable
  security definer
  set search_path = public, pg_catalog
as $$
  select
    p.tablename::text, p.policyname::text, p.cmd::text, p.roles::text[],
    p.qual::text, p.with_check::text,
    (((p.qual = 'true' or p.qual is null and p.cmd in ('INSERT')) or p.with_check = 'true')
     and ('anon' = any(p.roles) or 'authenticated' = any(p.roles) or 'public' = any(p.roles))) as is_unsafe,
    case
      when p.qual = 'true' and p.with_check = 'true' then 'Klauzule USING i WITH CHECK ustawione na true.'
      when p.qual = 'true' then 'Klauzula USING ustawiona na true.'
      when p.with_check = 'true' then 'Klauzula WITH CHECK ustawiona na true.'
      else 'OK'
    end as reason
  from pg_policies p
  where p.schemaname = 'public'
  order by p.tablename, p.cmd, p.policyname;
$$;

grant execute on function public.get_rls_audit() to anon, authenticated;`;
