import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Item 80: buduje listę dozwolonych originów dla danego projektu.
 * Zwracamy:
 *  - subdomena publikacji `{slug}.wybitny.website`
 *  - zweryfikowana custom domain z `projects.custom_domain`
 *    (gdy `projects.custom_domain_verified_at IS NOT NULL`)
 *  - localhost (dev)
 */
async function getAllowedOrigins(
  supabase: ReturnType<typeof getServiceClient>,
  projectId: string,
): Promise<Set<string>> {
  const allowed = new Set<string>();
  const { data: project } = await supabase
    .from("projects")
    .select("slug, custom_domain, custom_domain_verified_at")
    .eq("id", projectId)
    .maybeSingle();

  if (project) {
    const slug = (project as { slug?: string | null }).slug;
    if (slug) {
      allowed.add(`https://${slug}.wybitny.website`);
    }
    const customDomain = (project as { custom_domain?: string | null })
      .custom_domain;
    const verifiedAt = (
      project as { custom_domain_verified_at?: string | null }
    ).custom_domain_verified_at;
    if (customDomain && verifiedAt) {
      allowed.add(`https://${customDomain}`);
      allowed.add(`https://www.${customDomain}`);
    }
  }

  // Dla deweloperów - localhost
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:5173"); // Vite default
    allowed.add("http://localhost:3000");
  }
  return allowed;
}

function pickCorsOrigin(
  reqOrigin: string | null,
  allowed: Set<string>,
): string | null {
  if (!reqOrigin) return null;
  if (allowed.has(reqOrigin)) return reqOrigin;
  return null;
}

/**
 * POST /api/form-submit?projectId=...
 *
 * Endpoint uzywany przez strony wygenerowane przez AI do zbierania leadow.
 * Wywolywany przez formularz kontaktowy w kodzie generowanym przez AI.
 *
 * Akcje:
 *  1) Zapisuje dane formularza do tabeli `form_submissions`.
 *  2) Pobiera email wlasciciela projektu.
 *  3) Wysyla powiadomienie email przez Resend API (jezeli RESEND_API_KEY jest ustawione).
 *
 * ENV:
 *  RESEND_API_KEY — klucz Resend (opcjonalny, bez niego tylko zapis do DB)
 *  RESEND_FROM_EMAIL — adres nadawcy (default: noreply@wybitnastrona.pl)
 *
 * Body: { fields: Record<string, string | number | boolean> }
 * Dodatkowe pola przez query: projectId
 *
 * CORS: endpoint musi akceptowac requesty z subdomen uzytkownikow
 * (wybitny.website, custom domains). Zwracamy naglowki CORS.
 */

// Item 80: bazowe nagłówki bez Access-Control-Allow-Origin - origin
// dobierany dynamicznie per-projekt w `buildCorsHeaders`.
const BASE_CORS_HEADERS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
};

function buildCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return BASE_CORS_HEADERS;
  return {
    ...BASE_CORS_HEADERS,
    "Access-Control-Allow-Origin": origin,
  };
}

export async function OPTIONS(req: Request) {
  // Dla preflight musimy znać projectId żeby zweryfikować Origin.
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const reqOrigin = req.headers.get("origin");
  if (!projectId) {
    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(null),
    });
  }
  const supabase = getServiceClient();
  const allowed = await getAllowedOrigins(supabase, projectId);
  const origin = pickCorsOrigin(reqOrigin, allowed);
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const reqOrigin = req.headers.get("origin");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing projectId query param" },
      { status: 400, headers: buildCorsHeaders(null) },
    );
  }

  const supabase = getServiceClient();
  const allowedOrigins = await getAllowedOrigins(supabase, projectId);
  const corsOrigin = pickCorsOrigin(reqOrigin, allowedOrigins);
  const corsHeaders = buildCorsHeaders(corsOrigin);

  // Item 80: blokujemy POST gdy Origin nie pasuje do projektu. Wyjątek:
  // brak Origin (curl, server-to-server) - akceptujemy żeby nie zepsuć
  // legacy integracji.
  if (reqOrigin && !corsOrigin) {
    return NextResponse.json(
      { error: "Origin not allowed for this project" },
      { status: 403, headers: BASE_CORS_HEADERS },
    );
  }

  // Item 77: rate limit. 5 zgłoszeń/min per IP+projectId zapobiega
  // floodingowi (boty wypełniające formularze).
  const ip = getClientIp(req);
  const limit = rateLimit(`form-submit:${ip}:${projectId}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Too many submissions",
        message: `Zbyt wiele zgłoszeń. Spróbuj ponownie za ${limit.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  let body: { fields?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders },
    );
  }

  const fields = body.fields ?? {};
  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: "fields object cannot be empty" },
      { status: 400, headers: corsHeaders },
    );
  }

  // Pobierz projekt i email wlasciciela.
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, title, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectErr || !project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  const ua = req.headers.get("user-agent") ?? null;

  // Zapisz submission.
  const { data: submission, error: insertErr } = await supabase
    .from("form_submissions")
    .insert({
      project_id: projectId,
      fields,
      ip_address: ip,
      user_agent: ua,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[form-submit] insert error:", insertErr);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500, headers: corsHeaders },
    );
  }

  // Wyslij email powiadomienie do wlasciciela przez Resend (opcjonalnie).
  const resendKey = process.env.RESEND_API_KEY;
  const ownerEmail = await getOwnerEmail(supabase, (project as { user_id: string }).user_id);

  if (resendKey && ownerEmail) {
    await sendNotificationEmail({
      apiKey: resendKey,
      toEmail: ownerEmail,
      projectTitle: (project as { title?: string }).title ?? "Twoja strona",
      fields,
      submissionId: submission.id,
    }).catch((err) => {
      console.warn("[form-submit] email send failed:", err);
    });

    await supabase
      .from("form_submissions")
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq("id", submission.id);
  }

  return NextResponse.json(
    { ok: true, id: submission.id },
    { headers: corsHeaders },
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOwnerEmail(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(userId);
    return user?.email ?? null;
  } catch {
    return null;
  }
}

async function sendNotificationEmail({
  apiKey,
  toEmail,
  projectTitle,
  fields,
  submissionId,
}: {
  apiKey: string;
  toEmail: string;
  projectTitle: string;
  fields: Record<string, unknown>;
  submissionId: string;
}) {
  const from =
    process.env.RESEND_FROM_EMAIL ?? "noreply@wybitnastrona.pl";

  const fieldsHtml = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #2a2a2a;font-weight:600;color:#d4c5a3;white-space:nowrap">${escapeHtml(k)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #2a2a2a;color:#f0ebe2">${escapeHtml(String(v))}</td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0a0a;color:#f0ebe2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden">
    <div style="background:#1a1a1a;padding:20px 24px;border-bottom:1px solid #2a2a2a">
      <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a6a">wybitnastrona.pl</p>
      <h1 style="margin:4px 0 0;font-size:18px;font-weight:500">Nowe zgłoszenie z formularza</h1>
    </div>
    <div style="padding:20px 24px">
      <p style="margin:0 0 16px;color:#8a8a8a;font-size:14px">Strona: <strong style="color:#d4c5a3">${escapeHtml(projectTitle)}</strong></p>
      <table style="width:100%;border-collapse:collapse;background:#1a1a1a;border-radius:8px;overflow:hidden;border:1px solid #2a2a2a">
        ${fieldsHtml}
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#555">ID: ${submissionId}</p>
    </div>
  </div>
</body>
</html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: `📩 Nowe zgłoszenie — ${projectTitle}`,
      html,
    }),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
