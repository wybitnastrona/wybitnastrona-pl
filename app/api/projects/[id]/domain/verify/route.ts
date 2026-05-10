import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { getDomainConfig, verifyDomain } from "@/lib/vercel";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await getProject(id);
  if (!project || project.user_id !== user.id || !project.custom_domain) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = await getDomainConfig(project.custom_domain);
  const verifyRes = await verifyDomain(project.custom_domain);

  if (verifyRes.verified) {
    await supabase
      .from("projects")
      .update({ custom_domain_verified_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({
    verified: verifyRes.verified,
    misconfigured: config?.misconfigured ?? false,
    configuredBy: config?.configuredBy ?? null,
    expected: {
      cnames: ["cname.vercel-dns.com"],
      aValues: ["76.76.21.21"],
    },
  });
}
