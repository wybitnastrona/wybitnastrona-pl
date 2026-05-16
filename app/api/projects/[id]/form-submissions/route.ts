import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

type Submission = {
  id: string;
  fields: Record<string, unknown>;
  email_sent?: boolean | null;
  ip_address?: string | null;
  created_at: string;
};

/**
 * GET /api/projects/[id]/form-submissions
 *
 * Zwraca listę zgłoszeń z formularzy dla projektu. Dynamicznie wybiera źródło:
 *
 *  a) BAZA ZEWNĘTRZNA (dedykowana Supabase właściciela):
 *     gdy projekt ma ustawione `database_url` + `database_anon_key`, łączymy
 *     się z tą instancją i czytamy `form_submissions`. Tabela MUSI mieć
 *     politykę RLS pozwalającą na select (lub być public), bo używamy
 *     anon key (service role nie jest przechowywany w naszej bazie).
 *
 *  b) BAZA WSPÓŁDZIELONA / PLATFORMA (default):
 *     używamy service role wybitnastrona.pl i czytamy z publicznej
 *     `form_submissions` filtrując po `project_id = id`.
 *
 * Tylko właściciel projektu może otworzyć ten endpoint.
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
    return await readFromExternal(
      project.database_url!,
      project.database_anon_key!,
    );
  }

  return await readFromShared(id);
}

async function readFromExternal(
  url: string,
  anonKey: string,
): Promise<NextResponse> {
  try {
    const client = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from("form_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({
        source: "external",
        rows: [],
        columns: [],
        message:
          'Tabela "form_submissions" nie istnieje w Twojej bazie lub RLS blokuje odczyt. Utwórz tabelę i politykę "select using (true)" albo poproś AI o jej utworzenie.',
        details: error.message,
      });
    }

    const rows = (data ?? []) as Submission[];
    return NextResponse.json({
      source: "external",
      rows,
      columns: collectColumns(rows),
      count: rows.length,
    });
  } catch (err) {
    return NextResponse.json({
      source: "external",
      rows: [],
      columns: [],
      message: "Nie udało się połączyć z zewnętrzną bazą Supabase.",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

async function readFromShared(projectId: string): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      {
        source: "shared",
        rows: [],
        columns: [],
        message:
          "Brak konfiguracji serwera (SUPABASE_SERVICE_ROLE_KEY). Skontaktuj się z administratorem.",
      },
      { status: 503 },
    );
  }
  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("form_submissions")
    .select("id, fields, ip_address, email_sent, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json(
      {
        source: "shared",
        rows: [],
        columns: [],
        message: "Błąd odczytu zgłoszeń.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Submission[];
  return NextResponse.json({
    source: "shared",
    rows,
    columns: collectColumns(rows),
    count: rows.length,
  });
}

/**
 * Z wszystkich obiektów `fields` wyciąga unikalny zbiór kluczy (kolumn).
 * Filtruje przez allowlist [a-zA-Z_][a-zA-Z0-9_]* żeby uniknąć dziwnych
 * znaków w nagłówkach tabeli/CSV.
 */
function collectColumns(rows: Submission[]): string[] {
  const SAFE = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
  const set = new Set<string>();
  for (const r of rows) {
    const f = r.fields ?? {};
    if (typeof f === "object" && f !== null) {
      for (const k of Object.keys(f)) if (SAFE.test(k)) set.add(k);
    }
  }
  return Array.from(set);
}
