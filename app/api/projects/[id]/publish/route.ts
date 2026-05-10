import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishProject, unpublishProject } from "@/lib/projects";
import { buildPublishUrl, getPublishDomain } from "@/lib/publish-url";
import { logProjectEvent } from "@/lib/analytics-server";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await publishProject(id);
    const domain = getPublishDomain();
    void logProjectEvent(supabase, {
      projectId: id,
      userId: user.id,
      type: "publish",
      metadata: { slug, domain },
    });
    return NextResponse.json({
      slug,
      domain,
      url: buildPublishUrl(slug, domain),
    });
  } catch (err) {
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
