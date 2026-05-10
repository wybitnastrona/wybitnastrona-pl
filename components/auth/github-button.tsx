"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/brand-icons";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign in with GitHub via Supabase OAuth.
 *
 * Important: we request `repo` (read & write to public/private repos) and
 * `read:user` so that the resulting `provider_token` can be used by
 * `app/api/github/push` and `app/api/export/github-pages` on behalf of the
 * user. Supabase exposes the GitHub access token as `session.provider_token`
 * after the redirect.
 */
export function GithubButton({ label }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleClick() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Repo scope is needed for our /api/github/push route to push code
        // back to the user's repo. read:user gives us the username for the
        // remote URL.
        scopes: "repo read:user",
      },
    });
    if (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="w-full border-white/15 bg-[#0d1117] text-white hover:bg-[#161b22]"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GithubIcon className="h-4 w-4" />
      )}
      {label ?? "Kontynuuj z GitHub"}
    </Button>
  );
}
