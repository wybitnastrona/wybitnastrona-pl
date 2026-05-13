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
import {
  DEFAULT_MODEL_ID,
  getModel,
  resolveAnthropicModel,
  type AiModelId,
} from "@/lib/ai-models";
import { buildRagContext } from "@/lib/rag";
import { logProjectEvent } from "@/lib/analytics-server";
import { fetchUnsplashImage } from "@/lib/unsplash";
import { generateImageForAI } from "@/lib/image-generator";
import { createJob, bumpJob, finishJob } from "@/lib/generation-jobs";
import {
  buildSystemPrompt,
  type GenerationMode,
} from "@/lib/ai-prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Margines przed limitem Vercela — zapis stanu + `is_continue` zamiast twardego timeoutu. */
const GENERATION_HANDOFF_DEADLINE_MS = 240_000;
/** Max kroków z narzędziami na turę build/continue; reszta przez „Kontynuuj generowanie”. */
const BUILD_CONTINUE_MAX_STEPS = 28;

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

const generateImageSchema = z.object({
  prompt: z
    .string()
    .min(5)
    .describe(
      "Detailed English description of the image. Include subject, lighting, mood. E.g: 'warm hotel lobby with modern reception desk, soft lighting, luxury interior'. The more specific the better.",
    ),
  style: z
    .enum(["photography", "illustration", "product"])
    .optional()
    .default("photography")
    .describe("photography (default for most pages), illustration (icons/decorative), product (e-commerce items)"),
  size: z
    .enum(["landscape", "portrait", "square"])
    .optional()
    .default("landscape")
    .describe("landscape for hero/banners, portrait for team photos, square for thumbnails"),
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

/**
 * Sanitize messages loaded from the DB before sending to the AI provider.
 *
 * Problem: when a generation is interrupted (timeout / error) mid-stream,
 * the AI SDK stores tool-call parts whose `input` is still an accumulated
 * JSON **string** instead of a parsed object.  Anthropic's API rejects these
 * with "tool_use.input: Input should be an object".
 *
 * Fix:
 * - For every tool part (type starts with "tool-") whose `input` is a string,
 *   try JSON.parse; fall back to {} if parsing fails.
 * - Drop tool parts that are still in "input-streaming" state (incomplete
 *   streaming fragment — no useful data, will cause orphaned tool calls).
 */
function sanitizeMessagesForAI(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => {
    if (message.role !== "assistant") return message;

    const sanitizedParts = message.parts
      .filter((part) => {
        const p = part as Record<string, unknown>;
        const type = typeof p.type === "string" ? p.type : "";
        if (!type.startsWith("tool-") && type !== "dynamic-tool") return true;
        // Drop incomplete streaming fragments — they have no parseable input.
        return p.state !== "input-streaming";
      })
      .map((part) => {
        const p = part as Record<string, unknown>;
        const type = typeof p.type === "string" ? p.type : "";
        if (!type.startsWith("tool-") && type !== "dynamic-tool") return part;

        // Ensure `input` is always a plain object, never a string.
        if (typeof p.input === "string") {
          try {
            return { ...p, input: JSON.parse(p.input as string) };
          } catch {
            return { ...p, input: {} };
          }
        }
        if (p.input === null || p.input === undefined) {
          return { ...p, input: {} };
        }
        return part;
      });

    return { ...message, parts: sanitizedParts } as UIMessage;
  });
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
  const modelId = (body.model ?? DEFAULT_MODEL_ID) as AiModelId;
  const mode: GenerationMode =
    body.mode === "plan"
      ? "plan"
      : body.mode === "discuss"
        ? "discuss"
        : body.mode === "continue"
          ? "continue"
          : "build";
  const modelDef = getModel(modelId); // pointCost based on requested model (UI already locked)

  if (!projectId || !messages?.length) {
    return NextResponse.json(
      { error: "Missing projectId or messages" },
      { status: 400 },
    );
  }

  // ─── Sprawdz saldo punktow ──────────────────────────────────────────────────
  // build/continue: pelny koszt (continue dokancza projekt -> liczy sie jak build).
  // plan: polowa.  discuss: 1/3.
  const pointsRequired =
    mode === "build" || mode === "continue"
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
  const effectiveModelId: AiModelId = modelId;

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
    .select("id, user_id, files, prompt, locked_files, template, mode, custom_system_context, is_wybitny")
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
  const projectTemplate = (project.template as string | null) ?? "react-ts";
  const projectMode = (project.mode as string | null) ?? "web";
  const isWybitny = (project.is_wybitny as boolean | null) === true;
  const customSystemContext = (project.custom_system_context as string | null)?.trim() ?? "";
  const customContextSuffix = customSystemContext
    ? `\n\nCUSTOM CONTEXT OD UZYTKOWNIKA (rygorystycznie przestrzegaj):\n${customSystemContext}`
    : "";
  const modelMessages = await convertToModelMessages(
    sanitizeMessagesForAI(messages),
    { ignoreIncompleteToolCalls: true },
  );
  const anthropicModel = resolveAnthropicModel(effectiveModelId);

  // ─── Create generation job for Realtime progress tracking ───────────────────
  const jobId = await createJob(supabase, {
    projectId,
    userId: user.id,
    mode,
    model: effectiveModelId,
  });

  // Inject existing file paths so AI knows which files can be patched vs created.
  // W trybie 'continue' lista jest *kluczowa* — to dane wejsciowe dla "doroboty".
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

  const handoffAbort = new AbortController();
  let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  let handoffFromDeadline = false;
  /** Liczba zakończonych kroków LLM (pętla narzędzi) — do wykrycia limitu `stopWhen`. */
  let completedLlmSteps = 0;
  if (mode === "build" || mode === "continue") {
    deadlineTimer = setTimeout(() => {
      handoffFromDeadline = true;
      handoffAbort.abort();
    }, GENERATION_HANDOFF_DEADLINE_MS);
  }

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
    generateImage: tool({
      description:
        "Generates a thematic AI image (DALL-E 3) matching the page context. Returns { url, alt }. ALWAYS use this for hero images, gallery photos, team portraits, product images — NEVER use gray placeholder divs. Build the prompt based on the website's purpose (e.g. 'cozy kindergarten classroom with happy children, bright colors' for a kindergarten site).",
      inputSchema: generateImageSchema,
      execute: async ({ prompt, style, size }) => {
        void bumpJob(supabase, jobId, `generateImage: ${prompt.slice(0, 50)}`);
        return generateImageForAI(prompt, style ?? "photography", size ?? "landscape");
      },
    }),
    fetchImage: tool({
      description:
        "[DEPRECATED — prefer generateImage] Fetches a real photo URL from Unsplash. Returns { url, alt, credit }.",
      inputSchema: fetchImageSchema,
      execute: async ({ query, orientation }) => {
        void bumpJob(supabase, jobId, `fetchImage: ${query}`);
        return fetchUnsplashImage(query, orientation === "squarish" ? "squarish" : orientation);
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
    abortSignal:
      mode === "build" || mode === "continue"
        ? handoffAbort.signal
        : undefined,
    system:
      buildSystemPrompt(mode, projectTemplate, projectMode, { isWybitny }) +
      `\n\n[PROJECT_CONTEXT] projectId="${projectId}" — uzyj tego ID w URL formularzy kontaktowych: /api/form-submit?projectId=${projectId}\n` +
      fileListContext +
      lockedContext +
      ragContext +
      customContextSuffix,
    messages: modelMessages,
    stopWhen: stepCountIs(
      mode === "plan"
        ? 4
        : mode === "discuss"
          ? 6
          : BUILD_CONTINUE_MAX_STEPS,
    ),
    tools:
      mode === "plan"
        ? planOnlyTools
        : mode === "discuss"
          ? discussTools
          : buildTools, // 'build' AND 'continue' share full tool set

    onStepFinish: async () => {
      completedLlmSteps += 1;
    },

    onFinish: async ({ totalUsage, response, finishReason }) => {
      if (deadlineTimer) {
        clearTimeout(deadlineTimer);
        deadlineTimer = null;
      }

      const markContinue =
        (mode === "build" || mode === "continue") &&
        (handoffFromDeadline ||
          (completedLlmSteps >= BUILD_CONTINUE_MAX_STEPS &&
            finishReason !== "stop"));

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

      const isReadOnly = mode === "plan" || mode === "discuss";
      if (isReadOnly) {
        // Tryb plan/discuss: odejmij kredyty przez finish_job (atomicznie).
        void finishJob(supabase, jobId, "completed", undefined, {
          inputTokens,
          outputTokens,
          totalTokens,
          pointsSpent: pointsRequired,
          pointsConsumed: pointsRequired,
          isContinue: false,
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

        // finish_job atomicznie odejmuje kredyty (p_points_consumed).
        void finishJob(supabase, jobId, "completed", undefined, {
          inputTokens,
          outputTokens,
          totalTokens,
          pointsSpent: pointsRequired,
          pointsConsumed: pointsRequired,
          isContinue: markContinue,
        });
      } catch (err) {
        console.error("Failed to persist files:", err);
        void finishJob(supabase, jobId, "failed", String(err), {
          inputTokens,
          outputTokens,
          totalTokens,
          pointsSpent: pointsRequired,
          pointsConsumed: 0,
          isContinue: false,
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
