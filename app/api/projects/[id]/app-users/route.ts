import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * Zwraca uzytkownikow aplikacji wygenerowanej w projekcie (tabela `users` w
 * dzielonej Wybitnej Bazie Danych). Pelni dwie funkcje:
 *
 * 1. Autoryzacja — caller MUSI byc wlascicielem projektu (RLS na `projects`
 *    + ponowny check `user_id === user.id`).
 * 2. SQL injection — nazwa tabeli `users` jest hardcoded, NIE pobierana z
 *    request body / query. Izolacja per-projekt: filtr `project_id` jest
 *    parametrem zapytania (PostgREST escape-uje za nas), plus RLS w bazie
 *    egzekwuje `request.headers."x-project-id"`.
 * 3. Kolumny — zwracane przez PostgREST jako klucze obiektow JSON, nigdy
 *    nie sklejane do dynamicznego SQL po stronie aplikacji.
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

  if (!project.app_db_enabled) {
    return NextResponse.json({
      enabled: false,
      columns: [],
      rows: [],
      message: "Wybitna Baza Danych nie jest aktywna dla tego projektu.",
    });
  }

  const url = process.env.NEXT_PUBLIC_APP_DB_URL;
  const anonKey = process.env.NEXT_PUBLIC_APP_DB_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      {
        enabled: true,
        columns: [],
        rows: [],
        message: "Wybitna Baza Danych nie jest skonfigurowana na serwerze.",
      },
      { status: 503 },
    );
  }

  // Klient z anon key — RLS w dzielonej bazie filtruje po `x-project-id`.
  // Dodatkowo bezposrednio aplikujemy `eq("project_id", id)` jako warstwa
  // obronna gdyby polityka RLS nie byla wlaczona dla danej tabeli.
  const sharedDb = createSupabaseClient(url, anonKey, {
    global: { headers: { "x-project-id": id } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Hardcoded "users" — uzytkownik NIE moze nadpisac nazwy tabeli przez API.
  const { data, error } = await sharedDb
    .from("users")
    .select("*")
    .eq("project_id", id)
    .limit(100);

  if (error) {
    return NextResponse.json({
      enabled: true,
      columns: [],
      rows: [],
      message:
        "Tabela `users` nie istnieje w Twojej dzielonej bazie lub nie ma dostepu. Poles AI o jej utworzenie.",
      details: error.message,
    });
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  // Identifier-safe filter: nazwy kolumn z PostgREST = klucze JSON i tak juz
  // sa walidowane przez parser Postgresa, ale dla pewnosci filtrujemy je
  // przez allowlist `[a-zA-Z_][a-zA-Z0-9_]*` zanim wyslemy do klienta.
  const SAFE_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const collected = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (SAFE_IDENT.test(k)) collected.add(k);
    }
  }
  const columns = Array.from(collected);

  return NextResponse.json({
    enabled: true,
    columns,
    rows,
    count: rows.length,
  });
}
