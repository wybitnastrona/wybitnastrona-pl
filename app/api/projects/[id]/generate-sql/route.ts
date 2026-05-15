import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = Promise<{ id: string }>;

const SYSTEM_PROMPT = `Jestes architektem baz danych Postgres / Supabase.
Na podstawie kodu i opisu aplikacji webowej zaproponuj MINIMALNY skrypt SQL
gotowy do wklejenia w Supabase SQL Editor.

ZASADY:
- Tylko CREATE TABLE, CREATE INDEX, ALTER TABLE ENABLE ROW LEVEL SECURITY,
  CREATE POLICY, CREATE EXTENSION jezeli potrzebne, CREATE FUNCTION jezeli niezbedne.
- Dla kazdej tabeli: enable RLS + min. 1 policy (uzywaj auth.uid() do izolacji per-user).
- Storage bucket: dodaj insert do storage.buckets + storage.objects policies, jezeli
  aplikacja uzywa uploadow.
- Kolumny: id uuid primary key default gen_random_uuid(), created_at timestamptz default now().
- Indeksy: dodaj na FK i kolumnach uzywanych w WHERE.
- BEZ komentarzy SQL na poczatku ("-- Migration for..."). Bez bloków pl/pgSQL chyba ze konieczne.
- BEZ markdownu / fence \`\`\`sql. Zwroc CZYSTY tekst SQL.
- Maks 80 linii. Tylko to co aplikacja faktycznie potrzebuje.
- Jezeli aplikacja jest tylko landingiem bez backendowych danych — zwroc krotki
  komentarz SQL '-- Ta strona nie wymaga bazy danych. Pomin krok.' i nic wiecej.`;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
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

  // Zbierz skondensowany kontekst kodu — tylko data files + nazwy plikow.
  // Wystarczy zeby AI zorientowala sie jakie tabele potrzebne (nie cala apka).
  const files = (project.files ?? {}) as Record<string, { code: string }>;
  const paths = Object.keys(files).sort();
  const dataFilePaths = paths.filter(
    (p) =>
      p.startsWith("/src/data/") ||
      p === "/.wybitna/project-info.json" ||
      p.endsWith("/types.ts"),
  );
  const dataSnippets = dataFilePaths
    .slice(0, 8)
    .map(
      (p) => `=== ${p} ===\n${(files[p]?.code ?? "").slice(0, 1500)}`,
    )
    .join("\n\n");

  const sectionPaths = paths
    .filter((p) => p.startsWith("/src/components/sections/"))
    .slice(0, 20);

  const userPrompt = `Opis aplikacji (od uzytkownika):
${project.prompt}

Tytul: ${project.title}
Tryb: ${project.mode ?? "web"}

Sekcje strony (${sectionPaths.length}):
${sectionPaths.join(", ")}

Pliki danych:
${dataSnippets || "(brak)"}

Zwroc minimalny SQL.`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    // Strip potential markdown fences just in case.
    const cleaned = text
      .replace(/^```(?:sql)?\s*\n/i, "")
      .replace(/\n```\s*$/i, "")
      .trim();
    return NextResponse.json({ sql: cleaned });
  } catch (err) {
    console.error("[generate-sql]", err);
    return NextResponse.json(
      {
        error: "generate_failed",
        message: err instanceof Error ? err.message : "AI generation failed.",
      },
      { status: 500 },
    );
  }
}
