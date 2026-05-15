import { notFound } from "next/navigation";
import { SandpackRunner } from "@/components/sandpack/sandpack-runner";
import { getProjectBySlug, isProjectOwnerPro } from "@/lib/projects";
import { MadeWithBadge } from "@/components/public-site/made-with-badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = Promise<{ subdomain: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { subdomain } = await params;
  const project = await getProjectBySlug(subdomain);
  if (!project) {
    return { title: "Nie znaleziono - wybitnastrona.pl" };
  }
  return {
    title: `${project.title} - wybitnastrona.pl`,
    description: project.prompt.slice(0, 160),
  };
}

export default async function SitePage({ params }: { params: Params }) {
  const { subdomain } = await params;
  const project = await getProjectBySlug(subdomain);

  if (!project) {
    notFound();
  }

  // Badge widoczny tylko dla FREE planu — PRO platnosci go zdejmuja.
  // Sprawdzane po wlascicielu projektu (`user_id`), nie po sesji
  // przegladajacego, bo to jego "marka".
  const ownerIsPro = await isProjectOwnerPro(project.user_id);

  return (
    <div className="h-screen w-screen">
      <SandpackRunner
        files={project.files}
        viewMode="preview"
        hideInternalNavigator
      />
      {!ownerIsPro && <MadeWithBadge />}
    </div>
  );
}
