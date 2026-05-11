import { ShellSidebar } from "@/components/app-shell/shell-sidebar";
import { ShellMobileHeader } from "@/components/app-shell/shell-mobile-header";
import { CreationHero } from "@/components/app-shell/creation-hero";
import { RecentlyEdited } from "@/components/app-shell/recently-edited";
import { LowPointsBanner } from "@/components/app-shell/low-points-banner";
import type { ProjectListItem } from "@/lib/types/project";

type AppShellProps = {
  projects: ProjectListItem[];
  /**
   * Czy aktualny uzytkownik jest w planie FREE. Decyduje o widocznosci modeli
   * w `CreationHero` — FREE widzi tylko model "Auto" (Haiku).
   */
  isFreeTier?: boolean;
};

export async function AppShell({ projects, isFreeTier = true }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <ShellSidebar />
      <main className="flex min-h-screen flex-1 flex-col">
        <ShellMobileHeader />
        <LowPointsBanner />
        <CreationHero isFreeTier={isFreeTier} />
        <RecentlyEdited projects={projects} />
      </main>
    </div>
  );
}
