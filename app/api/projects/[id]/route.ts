import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { updateProjectTitle } from "@/lib/projects";
import { removeProjectDomain } from "@/lib/vercel";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

type Params = Promise<{ id: string }>;

export async function PATCH(
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

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (parsed.data.title) {
    await updateProjectTitle(id, parsed.data.title);
  }

  return NextResponse.json({ ok: true });
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

  // Item 49: detach custom domain z Vercela PRZED usunięciem rekordu z DB.
  // Inaczej domena pozostaje "zajęta" w Vercel i nie da się jej podpiąć
  // do nowego projektu bez ręcznego usuwania w panelu.
  const { data: projectRow } = await supabase
    .from("projects")
    .select("custom_domain, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!projectRow || projectRow.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (projectRow.custom_domain) {
    // Nie blokujemy usunięcia projektu jeśli Vercel API zawiedzie -
    // user może i tak ręcznie usunąć z Vercel dashboard.
    await removeProjectDomain(projectRow.custom_domain).catch((e) => {
      console.warn("[project DELETE] removeProjectDomain failed", e);
    });
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
