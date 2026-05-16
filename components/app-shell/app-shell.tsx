import { ShellSidebar } from "@/components/app-shell/shell-sidebar";
import { ShellMobileHeader } from "@/components/app-shell/shell-mobile-header";
import { CreationHero } from "@/components/app-shell/creation-hero";
import { RecentlyEdited } from "@/components/app-shell/recently-edited";
import { LowPointsBanner } from "@/components/app-shell/low-points-banner";
import type { ProjectListItem } from "@/lib/types/project";
import type { UserTier } from "@/lib/ai-models";

type AppShellProps = {
  projects: ProjectListItem[];
  /**
   * Tier zalogowanego użytkownika - decyduje o widocznych platformach,
   * modelach AI i trybie WYBITNY w `CreationHero`.
   */
  userTier?: UserTier;
};

export async function AppShell({ projects, userTier = "free" }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <ShellSidebar />
      {/* lg:pl-60 kompensuje fixed sidebar (w-60 = 240px) */}
      <main className="flex min-h-screen flex-1 flex-col lg:pl-60">
        <ShellMobileHeader />
        <LowPointsBanner />
        <CreationHero userTier={userTier} />
        <RecentlyEdited projects={projects} />
      </main>
    </div>
  );
}
