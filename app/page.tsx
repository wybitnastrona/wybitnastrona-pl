import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Frameworks } from "@/components/landing/frameworks";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Showcase } from "@/components/landing/showcase";
import { Faq } from "@/components/landing/faq";
import { CtaFooter } from "@/components/landing/cta-footer";
import { Footer } from "@/components/footer";
import { AppShell } from "@/components/app-shell/app-shell";
import { listMyProjects } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const projects = await listMyProjects();
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle();
    const rawTier = (profile?.tier as string | null) ?? "free";
    // Legacy 'wybitny' tier rolled up into 'pro' after migration 0033.
    const userTier: "free" | "pro" =
      rawTier === "pro" || rawTier === "wybitny" ? "pro" : "free";
    return <AppShell projects={projects} userTier={userTier} />;
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col" id="hero">
        <Hero />
        <Frameworks />
        <HowItWorks />
        <Showcase />
        <Faq />
        <CtaFooter />
      </main>
      <Footer />
    </>
  );
}
