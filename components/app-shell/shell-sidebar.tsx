"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FolderKanban,
  HelpCircle,
  Home,
  Search,
  Star,
} from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { CreditsPill } from "@/components/app-shell/credits-pill";
import { SidebarMobileApps } from "@/components/app-shell/sidebar-mobile-apps";

const NAV = [
  { href: "/", label: "Start", icon: Home, exact: true },
  { href: "/dashboard", label: "Projekty", icon: FolderKanban, exact: false },
];

export function ShellSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-beige/10 bg-background lg:flex">
      <div className="flex items-center justify-between gap-2 border-b border-beige/10 px-3 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-beige text-xs font-medium text-beige-foreground">
            W
          </span>
          <span className="text-sm font-medium text-beige">
            wybitnastrona<span className="text-beige/60">.pl</span>
          </span>
        </Link>
        <UserMenu variant="shell" />
      </div>

      <div className="px-3 py-3">
        <div className="flex h-9 items-center gap-2 rounded-md border border-beige/15 bg-card/40 px-2 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>Szukaj projektow</span>
          <span className="ml-auto rounded border border-beige/15 px-1 font-mono text-[10px]">
            Ctrl K
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                    isActive
                      ? "bg-beige/10 text-beige"
                      : "text-foreground/80 hover:bg-white/5 hover:text-beige"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <span className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60">
              <Star className="h-4 w-4" />
              Ulubione
              <span className="ml-auto rounded-full border border-beige/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                Wkrotce
              </span>
            </span>
          </li>
        </ul>

        <SidebarMobileApps />

        <div className="mt-6 px-2 text-xs uppercase tracking-wider text-muted-foreground/70">
          Pomoc
        </div>
        <ul className="mt-1 space-y-0.5">
          <li>
            <Link
              href="/docs"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/70 transition hover:bg-white/5 hover:text-beige"
            >
              <BookOpen className="h-4 w-4" />
              Dokumentacja
            </Link>
          </li>
          <li>
            <Link
              href="/help-faq"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/70 transition hover:bg-white/5 hover:text-beige"
            >
              <HelpCircle className="h-4 w-4" />
              Pomoc i FAQ
            </Link>
          </li>
        </ul>
      </nav>

      <div className="border-t border-beige/10 px-3 py-3">
        <CreditsPill />
        <p className="mt-2 text-[11px] text-muted-foreground">
          (c) {new Date().getFullYear()} wybitnastrona.pl
        </p>
      </div>
    </aside>
  );
}
