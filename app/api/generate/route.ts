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
import { updateProjectFiles, createSnapshot } from "@/lib/projects";
import type { ProjectFiles } from "@/lib/types/project";
import { getModel, resolveAnthropicModel, type AiModelId } from "@/lib/ai-models";
import { buildRagContext } from "@/lib/rag";
import { logProjectEvent } from "@/lib/analytics-server";

export const runtime = "nodejs";
export const maxDuration = 60;

type GenerationMode = "build" | "plan";

const BASE_PROMPT = `Jestes asystentem wybitnastrona.pl - generatorem stron internetowych.

ZADANIE
Generujesz aplikacje React (TypeScript + JSX) renderowane w Sandpack, ktore odpowiadaja na prompt uzytkownika.

STACK
- React 19 + TypeScript (.tsx)
- Tailwind CSS przez CDN (klasy uzywaj swobodnie, sa juz dostepne)
- Bez zaleznosci NPM innych niz react, react-dom (chyba ze uzytkownik wprost poprosi)
- Pliki maja sciezki absolutne zaczynajace sie od "/" (np. "/App.tsx", "/components/Hero.tsx")
- Persystencja danych: jezeli uzytkownik prosi o backend / baze / tabele, zaproponuj uzycie Supabase (nie nazywaj go "Bolt Database").

NARZEDZIA
1) showPlan(steps[]) - PRZED implementacja zwroc liste konkretnych krokow ktore wykonasz.
2) writeFile(path, content) - tworzy lub nadpisuje plik
3) deleteFile(path) - usuwa plik

ZASADY
- Najpierw wywolaj showPlan z lista krokow.
- Glowny plik to /App.tsx (export default function App)
- /index.tsx i /index.html sa juz utworzone, NIE nadpisuj ich
- Stosuj nowoczesny, estetyczny design (dark mode lub ciekawa paleta), zaokraglone rogi, dobra typografia
- Komponenty wydzielaj do osobnych plikow w /components/*.tsx jezeli sa dluzsze niz ~80 linii
- Nie uzywaj nazwy "Bolt" w odpowiedziach.
- Jezyk odpowiedzi: polski.

OBRAZY (VISION):
- Jezeli uzytkownik dolaczyl obraz, traktuj go jako referencje wizualna.
- Odtworz layout, kolory i typografie 1:1 z obrazu uzywajac Tailwind CSS.
- Jezeli obraz pokazuje mockup UI, zaimplementuj go jako React komponenty.
`;

const PLAN_ONLY_SUFFIX = `
TRYB: PLAN.
W tym trybie WYLACZNIE wywolaj narzedzie showPlan z lista krokow (3-10 krokow).
NIE pisz plikow przez writeFile.
Po wywolaniu showPlan dodaj krotkie podsumowanie po polsku (1-3 zdania) co planujesz
zbudowac i poproc uzytkownika o zatwierdzenie ("Wlacz tryb Build i kliknij wyslij,
zeby rozpoczac implementacje.").
`;

const BUILD_SUFFIX = `
TRYB: BUILD.
Wykonaj plan: 1) showPlan, 2) writeFile dla wszystkich potrzebnych plikow, 3) krotkie
podsumowanie po polsku co zbudowales.
`;

const writeFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe('Absolutna sciezka pliku zaczynajaca sie od "/"'),
  content: z.string().describe("Pelna zawartosc pliku."),
});

const deleteFileSchema = z.object({
  path: z.string().min(1).describe("Sciezka pliku do usuniecia."),
});

const showPlanSchema = z.object({
  steps: z
    .array(z.string().min(1))
    .min(1)
    .max(12)
    .describe("Lista krokow ktore wykonasz w tej iteracji."),
});

function buildSystemPrompt(mode: GenerationMode): string {
  return BASE_PROMPT + (mode === "plan" ? PLAN_ONLY_SUFFIX : BUILD_SUFFIX);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    projectId?: string;
    messages?: UIMessage[];
    model?: AiModelId;
    mode?: GenerationMode;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectId = body.projectId;
  const messages = body.messages;
  const modelId = (body.model ?? "claude-sonnet-4-6") as AiModelId;
  const mode: GenerationMode = body.mode === "plan" ? "plan" : "build";
  const modelDef = getModel(modelId);

  if (!projectId || !messages?.length) {
    return NextResponse.json(
      { error: "Missing projectId or messages" },
      { status: 400 },
    );
  }

  // ─── Sprawdz saldo punktow ──────────────────────────────────────────────────
  // Tryb "plan" kosztuje polowe (zaokraglonej w gore) punktow modelu.
  const pointsRequired =
    mode === "plan" ? Math.ceil(modelDef.pointCost / 2) : modelDef.pointCost;

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("Failed to fetch profile:", profileErr);
  }

  const currentPoints = (profileRow?.points as number | null) ?? 0;

  if (currentPoints < pointsRequired) {
    return NextResponse.json(
      {
        error: "Insufficient points",
        pointsRequired,
        pointsAvailable: currentPoints,
        hint: "Uzupelnij punkty w ustawieniach konta.",
      },
      { status: 402 },
    );
  }

  // ─── Pobierz projekt ────────────────────────────────────────────────────────
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
  const anthropicModel = resolveAnthropicModel(modelId);

  // Faza 3.3: pobierz kontekst z knowledge base ostatniego komunikatu usera.
  // Jezeli OPENAI_API_KEY nie jest skonfigurowane lub brak dokumentow, ragContext = "".
  const lastUserMsg = messages[messages.length - 1];
  const lastUserText =
    lastUserMsg?.parts
      ?.map((p) => ("text" in p && typeof p.text === "string" ? p.text : ""))
      .join(" ")
      .trim() ?? "";
  const ragContext = await buildRagContext(supabase, {
    userId: user.id,
    projectId,
    query: lastUserText,
  });

  const result = streamText({
    model: anthropic(anthropicModel),
    system: buildSystemPrompt(mode) + ragContext,
    messages: modelMessages,
    stopWhen: stepCountIs(mode === "plan" ? 3 : 14),
    // Faza 1.3: AI SDK v6 streamuje czesciowe argumenty tool calls domyslnie.
    // Klient widzi pisanie pliku znak po znaku (typewriter effect) przez state=input-streaming.
    tools: {
      showPlan: tool({
        description:
          "Wyswietla uzytkownikowi liste krokow przed implementacja. Wywoluj raz na poczatku.",
        inputSchema: showPlanSchema,
        execute: async ({ steps }) => {
          return { ok: true, steps };
        },
      }),
      writeFile: tool({
        description: "Tworzy lub nadpisuje plik. Sciezka absolutna od '/'.",
        inputSchema: writeFileSchema,
        execute: async ({ path, content }) => {
          if (mode === "plan") {
            return {
              ok: false,
              skipped: true,
              reason: "Tryb Plan - nie tworze plikow.",
            };
          }
          const normalized = path.startsWith("/") ? path : `/${path}`;
          files[normalized] = { code: content };
          return { ok: true, path: normalized, bytes: content.length };
        },
      }),
      deleteFile: tool({
        description: "Usuwa plik z projektu.",
        inputSchema: deleteFileSchema,
        execute: async ({ path }) => {
          if (mode === "plan") {
            return {
              ok: false,
              skipped: true,
              reason: "Tryb Plan - nie usuwam plikow.",
            };
          }
          const normalized = path.startsWith("/") ? path : `/${path}`;
          delete files[normalized];
          return { ok: true, path: normalized };
        },
      }),
    },
    onFinish: async () => {
      // Faza 2.7: trackuj kazde zapytanie.
      void logProjectEvent(supabase, {
        projectId,
        userId: user.id,
        type: "prompt",
        metadata: { mode, model: modelId, cost: pointsRequired },
      });

      if (mode === "plan") {
        // Tryb plan: odbierz polowe kosztu jako oplate za analze.
        await supabase
          .rpc("deduct_points", {
            p_user_id: user.id,
            amount: pointsRequired,
          })
          .then(
            ({ error }) => { if (error) console.error("deduct_points (plan):", error); },
          );
        return;
      }

      try {
        // Snapshot przed nadpisaniem.
        const { data: current } = await supabase
          .from("projects")
          .select("files")
          .eq("id", projectId)
          .single();

        if (current?.files) {
          const lastMsg = messages[messages.length - 1];
          const firstPart = lastMsg?.parts?.[0];
          const label =
            firstPart &&
            "text" in firstPart &&
            typeof firstPart.text === "string"
              ? firstPart.text.slice(0, 80)
              : undefined;
          await createSnapshot(
            projectId,
            current.files as ProjectFiles,
            label,
          ).catch(() => {});
        }

        await updateProjectFiles(projectId, files);

        // Odejmij punkty po udanym zapisie.
        await supabase
          .rpc("deduct_points", {
            p_user_id: user.id,
            amount: pointsRequired,
          })
          .then(
            ({ error }) => { if (error) console.error("deduct_points (build):", error); },
          );
      } catch (err) {
        console.error("Failed to persist files:", err);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
