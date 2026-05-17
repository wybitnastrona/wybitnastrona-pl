import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject, updateProjectCustomDomain } from "@/lib/projects";
import { addProjectDomain } from "@/lib/vercel";
import {
  DOMAIN_COMMISSION_USD,
  checkPorkbunAvailability,
  registerPorkbunDomain,
} from "@/lib/porkbun";

export const runtime = "nodejs";

const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/**
 * POST /api/domains/register
 * body: { domain, projectId, expectedTotal? }
 *
 * Rejestruje domene przez Porkbun, dopina ja do projektu Vercel, zapisuje
 * jako `custom_domain` projektu. Marza $5 dolicz w UI/Stripe checkout — ten
 * endpoint sam wykonuje rejestracje (jezeli klucze sa skonfigurowane).
 *
 * Jezeli `PORKBUN_API_KEY` nie jest ustawione, zwracamy 503 — UI pokazuje
 * komunikat ze rejestracja jeszcze nie jest dostepna.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: string; projectId?: string; expectedTotal?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const domain = (body.domain ?? "").trim().toLowerCase();
  const projectId = (body.projectId ?? "").trim();
  if (!domain || !projectId) {
    return NextResponse.json(
      { error: "Wymagane: domain + projectId" },
      { status: 400 },
    );
  }

  const cleaned = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!DOMAIN_REGEX.test(cleaned)) {
    return NextResponse.json(
      { error: "Nieprawidlowy format domeny" },
      { status: 400 },
    );
  }

  const project = await getProject(projectId);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Item 45: price reservation guard. Sprawdzamy aktualną cenę domeny w Porkbun
  // tuż przed zakupem i porównujemy z `expectedTotal` z body (cena wyświetlona
  // userowi w UI). Jeśli cena urosła o > $1 między search a checkout, zwracamy
  // 409 zamiast cicho pobrać większą kwotę.
  if (typeof body.expectedTotal === "number" && body.expectedTotal > 0) {
    const recheck = await checkPorkbunAvailability(cleaned);
    if (recheck.ok) {
      if (!recheck.available) {
        return NextResponse.json(
          {
            error: "Domain taken",
            message:
              "Ktoś kupił tę domenę po Twoim wyszukaniu. Wybierz inną.",
          },
          { status: 409 },
        );
      }
      const base = recheck.price ?? recheck.regularPrice ?? 0;
      const liveTotal =
        Math.round((base + DOMAIN_COMMISSION_USD) * 100) / 100;
      const diff = Math.abs(liveTotal - body.expectedTotal);
      if (diff > 1) {
        return NextResponse.json(
          {
            error: "Price changed",
            message: `Cena domeny zmieniła się z $${body.expectedTotal.toFixed(2)} na $${liveTotal.toFixed(2)}. Odśwież i potwierdź nową cenę.`,
            expectedTotal: body.expectedTotal,
            liveTotal,
          },
          { status: 409 },
        );
      }
    }
    // Jeśli recheck się nie udał (Porkbun chwilowo down) - kontynuujemy
    // bo nie chcemy blokować zakupu z powodu transient błędu.
  }

  // 1. Rejestracja w Porkbun.
  const result = await registerPorkbunDomain(cleaned);
  if (!result.ok) {
    if (result.error === "not_configured") {
      return NextResponse.json(
        {
          error: "not_configured",
          message:
            "Rejestracja domen przez Porkbun nie jest jeszcze skonfigurowana. Skontaktuj sie z administratorem.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: result.error },
      { status: 502 },
    );
  }

  // 2. Dopinamy domene do projektu Vercel (jezeli VERCEL skonfigurowany).
  let attached = false;
  let attachError: string | undefined;
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
    const attach = await addProjectDomain(cleaned);
    attached = attach.ok;
    if (!attach.ok) attachError = attach.error;
  }

  // 3. Zapisujemy w DB jako custom domain projektu.
  await updateProjectCustomDomain(projectId, cleaned);

  return NextResponse.json({
    ok: true,
    domain: cleaned,
    orderId: result.orderId,
    attached,
    attachError,
    commission: DOMAIN_COMMISSION_USD,
  });
}
