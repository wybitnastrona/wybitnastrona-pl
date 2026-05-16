import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  publishProject,
  unpublishProject,
  PublishError,
} from "@/lib/projects";
import { buildPublishUrl, getPublishDomain } from "@/lib/publish-url";
import { logProjectEvent } from "@/lib/analytics-server";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Opcjonalny custom slug w body — gdy user edytuje subdomene w PublishDialog.
  let customSlug: string | null = null;
  try {
    const body = (await req.json()) as { slug?: unknown };
    if (typeof body?.slug === "string") customSlug = body.slug;
  } catch {
    /* puste body lub bez JSON-a — to OK, leci domyslny flow */
  }

  try {
    const { slug } = await publishProject(id, customSlug);
    const domain = getPublishDomain();
    void logProjectEvent(supabase, {
      projectId: id,
      userId: user.id,
      type: "publish",
      metadata: { slug, domain, custom: customSlug ?? undefined },
    });

    // Fire-and-forget: zrob screenshot po publikacji. Sluzy do refresha
    // miniaturek na dashboardzie. Bledy logujemy ale nie blokujemy publish-a.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const cookie = req.headers.get("cookie");
      void fetch(`${appUrl}/api/projects/${id}/screenshot`, {
        method: "POST",
        headers: cookie ? { cookie } : undefined,
      }).catch((e) => {
        console.warn("[publish] screenshot fire-and-forget failed:", e);
      });
    }

    return NextResponse.json({
      slug,
      domain,
      url: buildPublishUrl(slug, domain),
    });
  } catch (err) {
    if (err instanceof PublishError) {
      const status =
        err.code === "slug_taken"
          ? 409
          : err.code === "invalid_slug"
            ? 400
            : err.code === "requires_pro"
              ? 402
              : err.code === "not_found"
                ? 404
                : 500;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Params },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await unpublishProject(id);

    // Fire-and-forget: wyczyść statyczny build z Storage.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const cookie = req.headers.get("cookie");
      void fetch(`${appUrl}/api/projects/${id}/deploy-static`, {
        method: "DELETE",
        headers: cookie ? { cookie } : undefined,
      }).catch((e) => {
        console.warn("[unpublish] deploy-static cleanup failed:", e);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
