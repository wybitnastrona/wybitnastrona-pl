import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProjectFiles } from "@/lib/projects";
import type { ProjectFiles } from "@/lib/types/project";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Jestes "wybitnastrona.pl" - generatorem stron internetowych dzialajacym jak bolt.new.

ZADANIE
Generujesz aplikacje React (TypeScript + JSX) renderowane w Sandpack, ktore odpowiadaja na prompt uzytkownika.

STACK
- React 19 + TypeScript (.tsx)
- Tailwind CSS przez CDN (klasy uzywaj swobodnie, sa juz dostepne)
- Bez zaleznosci NPM innych niz react, react-dom (chyba ze uzytkownik wprost poprosi)
- Pliki maja sciezki absolutne zaczynajace sie od "/" (np. "/App.tsx", "/components/Hero.tsx")

NARZEDZIA
Masz dwa narzedzia:
1) writeFile(path, content) - tworzy lub nadpisuje plik
2) deleteFile(path) - usuwa plik

ZASADY
- Glowny plik to /App.tsx (export default function App)
- /index.tsx i /index.html sa juz utworzone, NIE nadpisuj ich
- Pisz CALY zawartosc kazdego pliku w jednym wywolaniu writeFile
- Stosuj nowoczesny, estetyczny design (dark mode lub ciekawa paleta), zaokraglone rogi, dobra typografia
- Komponenty wydzielaj do osobnych plikow w /components/*.tsx jezeli sa dluzsze niz ~80 linii
- Nie dodawaj komentarzy w stylu "// import the module"
- Po wprowadzeniu plikow napisz krotkie podsumowanie po polsku (1-3 zdania) co zbudowales

JEZYK ODPOWIEDZI: polski.
`;

const writeFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe(
      'Absolutna sciezka pliku zaczynajaca sie od "/" (np. "/App.tsx" albo "/components/Hero.tsx").',
    ),
  content: z.string().describe("Pelna zawartosc pliku."),
});

const deleteFileSchema = z.object({
  path: z.string().min(1).describe("Sciezka pliku do usuniecia."),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: string; messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectId = body.projectId;
  const messages = body.messages;

  if (!projectId || !messages?.length) {
    return NextResponse.json(
      { error: "Missing projectId or messages" },
      { status: 400 },
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id, files, prompt")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const files: ProjectFiles = (project.files as ProjectFiles) ?? {};

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(12),
    tools: {
      writeFile: tool({
        description:
          "Tworzy lub nadpisuje plik w projekcie. Uzyj absolutnej sciezki zaczynajacej sie od '/'.",
        inputSchema: writeFileSchema,
        execute: async ({ path, content }) => {
          const normalized = path.startsWith("/") ? path : `/${path}`;
          files[normalized] = { code: content };
          return { ok: true, path: normalized, bytes: content.length };
        },
      }),
      deleteFile: tool({
        description: "Usuwa plik z projektu.",
        inputSchema: deleteFileSchema,
        execute: async ({ path }) => {
          const normalized = path.startsWith("/") ? path : `/${path}`;
          delete files[normalized];
          return { ok: true, path: normalized };
        },
      }),
    },
    onFinish: async () => {
      try {
        await updateProjectFiles(projectId, files);
      } catch (err) {
        console.error("Failed to persist files:", err);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
