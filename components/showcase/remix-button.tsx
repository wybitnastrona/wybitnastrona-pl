"use client";

import { useState } from "react";
import { Loader2, GitFork } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { navigateToProjectHref } from "@/lib/nav/full-document-navigation";

export function RemixButton({ projectId }: { projectId: string }) {
  const { user, openAuth } = useAuth();
  const [busy, setBusy] = useState(false);

  async function remix() {
    if (!user) {
      openAuth({ mode: "login" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/projects/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (data.id) navigateToProjectHref(`/project/${data.id}`);
      else alert(data.error ?? "Błąd remixu");
    } catch {
      alert("Błąd sieci");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remix}
      disabled={busy}
      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-beige/20 px-2.5 py-1 text-xs text-foreground transition hover:border-beige/40 hover:text-beige disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <GitFork className="h-3 w-3" />
      )}
      Remix
    </button>
  );
}
