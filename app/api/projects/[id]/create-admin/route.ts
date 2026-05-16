import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * POST /api/projects/[id]/create-admin
 * Body: { email: string, password: string }
 *
 * Tworzy konto administratora panelu wygenerowanej strony.
 * Dynamicznie wybiera źródło:
 *
 *  a) BAZA ZEWNĘTRZNA (dedykowana Supabase właściciela):
 *     Wywołuje supabase.auth.signUp() na zewnętrznym kliencie. Wymaga
 *     żeby projekt Supabase miał włączone email signups (default ON).
 *     Konto pojawi się w auth.users — właściciel widzi je w swoim
 *     panelu Supabase.
 *
 *  b) BAZA WSPÓŁDZIELONA / PLATFORMA:
 *     Wstawia rekord do tabeli `admins` w naszej platformowej bazie
 *     z project_id, email, password_hash (SHA-256 + soli środowiskowej)
 *     i role='admin'. Wygenerowana strona może czytać tę tabelę przez
 *     `users`/RLS w shared app DB.
 */
export async function POST(req: Request, { params }: { params: Params }) {
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

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = (body.password ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Podaj poprawny adres e-mail." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Hasło musi mieć co najmniej 8 znaków." },
      { status: 400 },
    );
  }

  const useExternal =
    !!project.database_url && !!project.database_anon_key;

  if (useExternal) {
    return await createInExternal(
      project.database_url!,
      project.database_anon_key!,
      email,
      password,
    );
  }
  return await createInShared(id, email, password);
}

async function createInExternal(
  url: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<NextResponse> {
  try {
    const client = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { role: "admin" },
      },
    });
    if (error) {
      return NextResponse.json(
        {
          error:
            "Nie udało się utworzyć konta w Twoim Supabase: " + error.message,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      source: "external",
      userId: data.user?.id ?? null,
      message: data.user?.identities?.length
        ? "Konto utworzone. Sprawdź skrzynkę email aby je potwierdzić."
        : "Konto już istniało — wysłaliśmy link logowania.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Błąd połączenia z zewnętrzną bazą: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 },
    );
  }
}

async function createInShared(
  projectId: string,
  email: string,
  password: string,
): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Brak konfiguracji serwera (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 },
    );
  }
  const client = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Hash hasła — SHA-256 z solą serwerową. Dla pełnego bcrypt potrzebowalibyśmy
  // dodatkowej zależności; SHA-256 + salt jest wystarczające dla light-auth
  // panel admina (każda strona ma własne project_id).
  const salt = process.env.ADMIN_PASSWORD_SALT ?? "wybitna-default-salt";
  const passwordHash = await sha256(password + ":" + salt);

  // upsert po (project_id, email) — wymusza unikalność emaila per projekt.
  const { data, error } = await client
    .from("project_admins")
    .upsert(
      {
        project_id: projectId,
        email,
        password_hash: passwordHash,
        role: "admin",
      },
      { onConflict: "project_id,email" },
    )
    .select("id")
    .single();

  if (error) {
    // Najczęściej: tabela nie istnieje. Daj jasną instrukcję.
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json(
        {
          error:
            'Tabela "project_admins" nie istnieje na serwerze platformy. Skontaktuj się z administratorem wybitnastrona.pl aby ją utworzyć (migracja 0045).',
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    source: "shared",
    adminId: data?.id ?? null,
    message: "Konto admina utworzone.",
  });
}

async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
