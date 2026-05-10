"use client";

import { useRouter } from "next/navigation";
import { CreditCard, Gift, LayoutGrid, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/auth-provider";
import { useSettings } from "@/components/settings/settings-provider";

type UserMenuProps = {
  variant?: "navbar" | "shell";
};

export function UserMenu({ variant = "navbar" }: UserMenuProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const settings = useSettings();

  if (!user) return null;

  const email = user.email ?? "";
  const initial = email[0]?.toUpperCase() ?? "U";
  const isShell = variant === "shell";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          isShell
            ? "flex h-8 w-8 items-center justify-center rounded-full bg-beige text-xs font-medium text-beige-foreground transition hover:opacity-90"
            : "flex h-9 cursor-pointer items-center gap-2 rounded-full border border-beige/20 bg-card px-2 pr-3 text-sm text-foreground transition hover:border-beige/40"
        }
        aria-label="Menu konta"
      >
        <span
          className={
            isShell
              ? "flex h-7 w-7 items-center justify-center text-sm"
              : "flex h-7 w-7 items-center justify-center rounded-full bg-beige text-xs font-medium text-beige-foreground"
          }
        >
          {initial}
        </span>
        {!isShell && (
          <span className="hidden max-w-[140px] truncate text-muted-foreground md:inline">
            {email}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 border-beige/20 bg-card"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            {email || "Konto"}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-beige/10" />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => settings.open("general")}>
            <Settings className="h-4 w-4" />
            Ustawienia
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => settings.open("subscription")}>
            <Gift className="h-4 w-4 text-beige/80" />
            <span className="text-beige/90">Zdobadz darmowe tokeny</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => settings.open("subscription")}>
            <CreditCard className="h-4 w-4" />
            Moja subskrypcja
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-beige/10" />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/dashboard")}>
            <LayoutGrid className="h-4 w-4" />
            Wszystkie projekty
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-beige/10" />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Wyloguj sie
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
