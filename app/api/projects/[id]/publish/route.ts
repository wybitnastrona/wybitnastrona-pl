import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishProject, unpublishProject } from "@/lib/projects";

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
    const rootDomain =
      process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
    const protocol = rootDomain.includes("localhost") ? "http" : "https";
    return NextResponse.json({
      slug,
      url: `${protocol}://${slug}.${rootDomain}`,
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
