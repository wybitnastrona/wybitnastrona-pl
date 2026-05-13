import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing projectId query param" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  let body: { fields?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const fields = body.fields ?? {};
  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: "fields object cannot be empty" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const supabase = getServiceClient();

  // Pobierz projekt i email wlasciciela.
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, title, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectErr || !project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
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
      { status: 500, headers: CORS_HEADERS },
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
    { headers: CORS_HEADERS },
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
