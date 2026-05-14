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
  _req: Request,
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
