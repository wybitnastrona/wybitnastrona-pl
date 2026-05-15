import { NextResponse } from "next/server";
import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getProject } from "@/lib/projects";
import { buildPublishUrl, getPublishDomain } from "@/lib/publish-url";
import {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
} from "@/lib/cloudinary";

/**
 * Screenshot endpoint — uzywa puppeteer-core + @sparticuz/chromium do
 * zrenderowania publikowanej strony projektu (`{slug}.wybitny.website`),
 * po czym wrzuca PNG do Cloudinary (folder `wybitnastrona/screenshots`,
 * stabilny `public_id = projectId` → kazda publikacja nadpisuje stary plik).
 *
 * Smart caching: ten endpoint jest wywolywany TYLKO raz, jako fire-and-forget
 * po udanej publikacji (`/api/projects/[id]/publish`). Dashboard NIE wywoluje
 * go ponownie — czyta `projects.preview_image_url` z bazy.
 *
 * Wymagania Vercel serverless:
 *  - `maxDuration: 60s` (puppeteer launch + render zajmuje 5-30s)
 *  - Memory: ≥ 1024 MB (chromium jest pamieciozerny — ustaw w Vercel
 *    Project Settings → Functions → Memory dla tego routu)
 *  - `@sparticuz/chromium` ~50 MB compressed; mieści sie na granicy 50 MB
 *    limitu Vercel Hobby. Dla Pro mamy 250 MB.
 *
 * Browser jest ZAWSZE zamykany w `finally` zeby nie wycieklo pamieci miedzy
 * warm-invocations.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
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

  if (!project.is_public || !project.slug) {
    return NextResponse.json(
      {
        error: "not_published",
        message: "Najpierw opublikuj projekt zeby zrobic screenshot.",
      },
      { status: 400 },
    );
  }

  // Cloudinary jest jedynym kanalem zapisu — nie ma silent fallbacku do
  // Supabase Storage. Jezeli klucze brakuja, zwracamy 503.
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "Cloudinary nie jest skonfigurowane na serwerze (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).",
      },
      { status: 503 },
    );
  }

  const targetUrl = buildPublishUrl(project.slug, getPublishDomain());

  let browser: Browser | undefined;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 45_000,
    });
    // Daj Sandpackowi/React czas na zrenderowanie animacji.
    await new Promise((r) => setTimeout(r, 1500));

    const png = (await page.screenshot({
      type: "png",
      fullPage: false,
    })) as Buffer;

    // Upload do Cloudinary — overwrite na public_id = projectId.
    const previewUrl = await uploadBufferToCloudinary(png, id);

    // Zapis URL-a w DB. Uzywamy service role bo route moze byc wywolany
    // z fire-and-forget bez waznej sesji uzytkownika (po publikacji).
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supaUrl && serviceKey) {
      const admin = createSupabaseClient(supaUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin
        .from("projects")
        .update({ preview_image_url: previewUrl })
        .eq("id", id);
    } else {
      // Fallback do server client (z sesja uzytkownika + RLS na user_id).
      await supabase
        .from("projects")
        .update({ preview_image_url: previewUrl })
        .eq("id", id);
    }

    return NextResponse.json({ ok: true, previewImageUrl: previewUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Screenshot failed" },
      { status: 500 },
    );
  } finally {
    // CRITICAL: zamykamy browser zeby pamiec nie wyciekala przy warm
    // invocations. Bez tego Vercel reuse-uje funkcje i pamiec narasta.
    await browser?.close();
  }
}
