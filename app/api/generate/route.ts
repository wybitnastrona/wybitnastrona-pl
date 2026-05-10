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
import { fetchUnsplashImage } from "@/lib/unsplash";
import { createJob, bumpJob, finishJob } from "@/lib/generation-jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

type GenerationMode = "build" | "plan" | "discuss";

const BASE_PROMPT = `Jestes asystentem wybitnastrona.pl — generatorem stron internetowych.

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
2) writeFile(path, content) - tworzy lub nadpisuje NOWY plik
3) patchFile(path, edits[]) - edytuje ISTNIEJACY plik przez search/replace (szybsze niz writeFile)
4) readFile(path) - odczytuje zawartosc istniejacego pliku (uzyj przed patchFile)
5) deleteFile(path) - usuwa plik
6) fetchImage(query) - pobiera URL zdjecia z Unsplash pasujacego do query (po angielsku). Uzyj zamiast placeholderow koloru gdy potrzebujesz realnego zdjecia.

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
zbudowac i napisz krotko "Kliknij Zatwierdz aby rozpoczac budowanie.".
`;

const BUILD_SUFFIX = `
TRYB: BUILD.
Uzytkownik zatwierdzil plan. Przejdz od razu do implementacji:
1) Dla NOWYCH plikow: writeFile(path, content).
2) Dla ISTNIEJACYCH plikow: uzyj patchFile(path, edits[]) — szybsze i tansze niz writeFile calego pliku.
3) Jezeli nie pamietasz dokladnej tresci istniejacego pliku, wywolaj readFile(path) zanim uzyjesz patchFile.
4) Krotkie podsumowanie po polsku co zbudowales.
NIE wywoluj showPlan ponownie — plan juz zostal pokazany i zatwierdzony.
`;

const DISCUSS_SUFFIX = `
TRYB: DISCUSS.
W tym trybie ROZMAWIASZ z uzytkownikiem o kodzie projektu — odpowiadasz na pytania, doradzasz,
proponujesz rozwiazania, tlumaczysz fragmenty kodu.
- NIE pisz, NIE edytuj, NIE usuwaj zadnych plikow.
- Mozesz uzyc readFile(path) aby przeczytac biezacy plik gdy uzytkownik o to pyta.
- Odpowiadaj zwiezle, w jezyku polskim, z konkretnymi cytatami z kodu gdy to pomocne.
- Jezeli uzytkownik prosi o zmiane w kodzie, zasugeruj zeby przelaczyl tryb na "Build"
  (przycisk obok pola czatu) i wytlumacz co dokladnie zostanie zmienione.
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

const fetchImageSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "English search query for the photo (e.g. 'personal trainer workout', 'restaurant food'). Keep it short.",
    ),
  orientation: z
    .enum(["landscape", "portrait", "squarish"])
    .optional()
    .default("landscape"),
});

const showPlanSchema = z.object({
  steps: z
    .array(z.string().min(1))
    .min(1)
    .max(12)
    .describe("Lista krokow ktore wykonasz w tej iteracji."),
});

const patchFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe('Absolutna sciezka pliku zaczynajaca sie od "/"'),
  edits: z
    .array(
      z.object({
        oldString: z
          .string()
          .min(1)
          .describe(
            "Exact existing content to replace — must appear exactly once in the file. Include enough surrounding lines to be unique.",
          ),
        newString: z
          .string()
          .describe("Replacement content."),
      }),
    )
    .min(1)
    .describe("List of search/replace edits to apply sequentially."),
});

const readFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe('Absolutna sciezka pliku zaczynajaca sie od "/"'),
});

function buildSystemPrompt(mode: GenerationMode): string {
  if (mode === "plan") return BASE_PROMPT + PLAN_ONLY_SUFFIX;
  if (mode === "discuss") return BASE_PROMPT + DISCUSS_SUFFIX;
  return BASE_PROMPT + BUILD_SUFFIX;
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
  const mode: GenerationMode =
    body.mode === "plan"
      ? "plan"
      : body.mode === "discuss"
        ? "discuss"
        : "build";
  const modelDef = getModel(modelId);

  if (!projectId || !messages?.length) {
    return NextResponse.json(
      { error: "Missing projectId or messages" },
      { status: 400 },
    );
  }

  // ─── Sprawdz saldo punktow ──────────────────────────────────────────────────
  // Tryb "plan" kosztuje polowe (zaokraglonej w gore) punktow modelu.
  // Discuss mode is read-only, plan mode produces only a list, build runs the
  // full pipeline. Charge accordingly.
  const pointsRequired =
    mode === "build"
      ? modelDef.pointCost
      : mode === "plan"
        ? Math.ceil(modelDef.pointCost / 2)
        : Math.max(1, Math.ceil(modelDef.pointCost / 3)); // discuss

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
    .select("id, user_id, files, prompt, locked_files")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const files: ProjectFiles = (project.files as ProjectFiles) ?? {};
  const lockedFiles = new Set<string>(
    ((project.locked_files as string[] | null) ?? []).map((p) =>
      p.startsWith("/") ? p : `/${p}`,
    ),
  );
  const modelMessages = await convertToModelMessages(messages);
  const anthropicModel = resolveAnthropicModel(modelId);

  // ─── Create generation job for Realtime progress tracking ───────────────────
  const jobId = await createJob(supabase, {
    projectId,
    userId: user.id,
    mode,
    model: modelId,
  });

  // Inject existing file paths so AI knows which files can be patched vs created.
  const existingPaths = Object.keys(files);
  const fileListContext =
    existingPaths.length > 0
      ? `\n\nISTNIEJACE PLIKI W PROJEKCIE (mozesz edytowac przez patchFile): ${existingPaths.join(", ")}\n`
      : "";
  const lockedContext =
    lockedFiles.size > 0
      ? `\nZABLOKOWANE PLIKI (NIE WOLNO ICH NADPISYWAC, EDYTOWAC ANI USUWAC): ${Array.from(lockedFiles).join(", ")}\nJezeli uzytkownik prosi o zmiane w zablokowanym pliku, poinformuj go zeby najpierw odblokowal plik w UI.\n`
      : "";

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

  // Discuss mode tools — read-only.  Only readFile is exposed so the AI can
  // quote the project's code accurately, but it CANNOT write or delete.
  const discussTools = {
    readFile: tool({
      description:
        "Zwraca aktualna zawartosc pliku z projektu, zeby moc o nim rozmawiac.",
      inputSchema: readFileSchema,
      execute: async ({ path }) => {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        const file = files[normalized];
        return file
          ? { ok: true, path: normalized, content: file.code }
          : { ok: false, error: `File ${normalized} not found.` };
      },
    }),
  };

  // In plan mode only expose showPlan — writeFile/deleteFile/fetchImage are
  // intentionally omitted so the AI literally cannot call them regardless of
  // what the system prompt says. This is the only reliable guard.
  const planOnlyTools = {
    showPlan: tool({
      description:
        "Wyswietla uzytkownikowi liste krokow przed implementacja. Wywoluj DOKLADNIE raz.",
      inputSchema: showPlanSchema,
      execute: async ({ steps }) => {
        void bumpJob(supabase, jobId, "showPlan");
        return { ok: true, steps };
      },
    }),
  };

  const buildTools = {
    showPlan: tool({
      description:
        "Wyswietla uzytkownikowi liste krokow przed implementacja. Wywoluj raz na poczatku.",
      inputSchema: showPlanSchema,
      execute: async ({ steps }) => {
        void bumpJob(supabase, jobId, "showPlan");
        return { ok: true, steps };
      },
    }),
    writeFile: tool({
      description: "Tworzy lub nadpisuje NOWY plik. Sciezka absolutna od '/'. Dla istniejacych plikow uzyj patchFile.",
      inputSchema: writeFileSchema,
      execute: async ({ path, content }) => {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        if (lockedFiles.has(normalized)) {
          return {
            ok: false,
            error: `File ${normalized} is LOCKED by the user — cannot overwrite. Inform the user that they need to unlock it first in the UI.`,
          };
        }
        files[normalized] = { code: content };
        void bumpJob(supabase, jobId, `writeFile: ${normalized}`, { path: normalized, kind: "write" });
        return { ok: true, path: normalized, bytes: content.length };
      },
    }),
    deleteFile: tool({
      description: "Usuwa plik z projektu.",
      inputSchema: deleteFileSchema,
      execute: async ({ path }) => {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        if (lockedFiles.has(normalized)) {
          return {
            ok: false,
            error: `File ${normalized} is LOCKED — cannot delete.`,
          };
        }
        delete files[normalized];
        void bumpJob(supabase, jobId, `deleteFile: ${normalized}`);
        return { ok: true, path: normalized };
      },
    }),
    fetchImage: tool({
      description:
        "Fetches a real photo URL from Unsplash matching the query. Returns { url, alt, credit, creditUrl }. Use this instead of gray placeholder images.",
      inputSchema: fetchImageSchema,
      execute: async ({ query, orientation }) => {
        void bumpJob(supabase, jobId, `fetchImage: ${query}`);
        return fetchUnsplashImage(query, orientation);
      },
    }),
    patchFile: tool({
      description:
        "Edytuje istniejacy plik przez sekwencje search/replace. Uzyj zamiast writeFile gdy plik juz istnieje — szybsze i tansze. Kazdy edit.oldString MUSI wystepowac dokladnie raz w pliku.",
      inputSchema: patchFileSchema,
      execute: async ({ path, edits }) => {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        if (lockedFiles.has(normalized)) {
          return {
            ok: false,
            error: `File ${normalized} is LOCKED by the user — cannot patch. Inform the user that they need to unlock it first in the UI.`,
          };
        }
        const file = files[normalized];
        if (!file) {
          return {
            ok: false,
            error: `File ${normalized} not found — use writeFile to create it first.`,
          };
        }
        let content = file.code;
        for (let i = 0; i < edits.length; i++) {
          const { oldString, newString } = edits[i];
          const idx = content.indexOf(oldString);
          if (idx === -1) {
            return {
              ok: false,
              error: `Edit ${i}: oldString not found. Call readFile(${normalized}) to see the current content, then retry with the exact string.`,
            };
          }
          const secondIdx = content.indexOf(oldString, idx + oldString.length);
          if (secondIdx !== -1) {
            return {
              ok: false,
              error: `Edit ${i}: oldString matches multiple locations — include more surrounding lines to make it unique.`,
            };
          }
          content =
            content.slice(0, idx) +
            newString +
            content.slice(idx + oldString.length);
        }
        files[normalized] = { code: content };
        void bumpJob(supabase, jobId, `patchFile: ${normalized}`, { path: normalized, kind: "patch" });
        return { ok: true, path: normalized, editsApplied: edits.length, content };
      },
    }),
    readFile: tool({
      description:
        "Zwraca aktualna zawartosc pliku. Wywoluj przed patchFile gdy nie pamietasz dokladnej tresci.",
      inputSchema: readFileSchema,
      execute: async ({ path }) => {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        const file = files[normalized];
        return file
          ? { ok: true, path: normalized, content: file.code }
          : { ok: false, error: `File ${normalized} not found.` };
      },
    }),
  };

  const result = streamText({
    model: anthropic(anthropicModel),
    system: buildSystemPrompt(mode) + fileListContext + lockedContext + ragContext,
    messages: modelMessages,
    stopWhen: stepCountIs(
      mode === "plan" ? 4 : mode === "discuss" ? 6 : 30,
    ),
    tools:
      mode === "plan"
        ? planOnlyTools
        : mode === "discuss"
          ? discussTools
          : buildTools,
    onFinish: async ({ totalUsage, response }) => {
      // Real token usage from the model run.
      const inputTokens = totalUsage?.inputTokens ?? undefined;
      const outputTokens = totalUsage?.outputTokens ?? undefined;
      const totalTokens =
        totalUsage?.totalTokens ??
        (inputTokens != null && outputTokens != null
          ? inputTokens + outputTokens
          : undefined);

      // We can't read the freshly-generated assistant message id from
      // `response.messages` (those are ModelMessages, no `id`). Instead we
      // link the snapshot to the *user* message that triggered this run —
      // the frontend then renders the rollback button on the assistant reply
      // immediately after that user message.
      void response;
      const triggeringUserMessageId =
        messages[messages.length - 1]?.role === "user"
          ? messages[messages.length - 1].id
          : undefined;

      void logProjectEvent(supabase, {
        projectId,
        userId: user.id,
        type: "prompt",
        metadata: {
          mode,
          model: modelId,
          cost: pointsRequired,
          inputTokens,
          outputTokens,
          totalTokens,
        },
      });

      if (mode === "plan" || mode === "discuss") {
        // Tryb plan/discuss: odejmij oplate, zadne pliki nie sa zapisywane.
        await supabase
          .rpc("deduct_points", {
            p_user_id: user.id,
            amount: pointsRequired,
          })
          .then(
            ({ error }) => {
              if (error) console.error(`deduct_points (${mode}):`, error);
            },
          );
        void finishJob(supabase, jobId, "completed", undefined, {
          inputTokens,
          outputTokens,
          totalTokens,
          pointsSpent: pointsRequired,
        });
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
            triggeringUserMessageId,
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

        void finishJob(supabase, jobId, "completed", undefined, {
          inputTokens,
          outputTokens,
          totalTokens,
          pointsSpent: pointsRequired,
        });
      } catch (err) {
        console.error("Failed to persist files:", err);
        void finishJob(supabase, jobId, "failed", String(err), {
          inputTokens,
          outputTokens,
          totalTokens,
          pointsSpent: pointsRequired,
        });
      }
    },
  });

  // Include the job id in the response headers so the frontend can subscribe
  // to Realtime updates on this specific job.
  const response = result.toUIMessageStreamResponse();
  response.headers.set("x-job-id", jobId);
  return response;
}
