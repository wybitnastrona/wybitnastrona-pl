import { notFound, redirect } from "next/navigation";
import type { UIMessage } from "ai";
import { ProjectWorkspace } from "@/components/project/project-workspace";
import { getProject, listChatMessages } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { getPublishDomain } from "@/lib/publish-url";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) {
    notFound();
  }

  const storedMessages = await listChatMessages(id);
  // Wiadomosci sa przechowywane w bazie zgodnie z formatem UIMessage z @ai-sdk.
  // Cast do UIMessage[] — runtime gwarantuje odpowiedni ksztalt parts (wpisy
  // sa serializowane bezposrednio z useChat().messages w PUT /messages).
  const initialMessages = storedMessages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
  })) as unknown as UIMessage[];

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const publishDomain = getPublishDomain();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const domainPartnerUrl =
    process.env.NEXT_PUBLIC_DOMAIN_PARTNER_URL ?? "https://zenbox.pl/";

  return (
    <ProjectWorkspace
      project={project}
      initialMessages={initialMessages}
      rootDomain={rootDomain}
      publishDomain={publishDomain}
      appUrl={appUrl}
      domainPartnerUrl={domainPartnerUrl}
    />
  );
}
