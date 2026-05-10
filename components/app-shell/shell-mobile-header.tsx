"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { UserMenu } from "@/components/user-menu";

export function ShellMobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-beige/10 bg-background/80 px-4 backdrop-blur lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-beige text-xs font-medium text-beige-foreground">
          W
        </span>
        <span className="text-sm font-medium text-beige">
          wybitnastrona<span className="text-beige/60">.pl</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/5 hover:text-beige"
          aria-label="Wszystkie projekty"
        >
          <LayoutGrid className="h-4 w-4" />
        </Link>
        <UserMenu variant="shell" />
      </div>
    </header>
  );
}
