import { ShellSidebar } from "@/components/app-shell/shell-sidebar";
import { ShellMobileHeader } from "@/components/app-shell/shell-mobile-header";
import { CreationHero } from "@/components/app-shell/creation-hero";
import { RecentlyEdited } from "@/components/app-shell/recently-edited";
import { LowPointsBanner } from "@/components/app-shell/low-points-banner";
import type { ProjectListItem } from "@/lib/types/project";

type AppShellProps = {
  projects: ProjectListItem[];
};

export async function AppShell({ projects }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <ShellSidebar />
      <main className="flex min-h-screen flex-1 flex-col">
        <ShellMobileHeader />
        <LowPointsBanner />
        <CreationHero />
        <RecentlyEdited projects={projects} />
      </main>
    </div>
  );
}
