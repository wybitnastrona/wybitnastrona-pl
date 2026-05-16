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
import {
  AVATAR_FOREGROUND,
  emailToColor,
  emailToInitial,
} from "@/lib/avatar-color";

type UserMenuProps = {
  variant?: "navbar" | "shell";
};

export function UserMenu({ variant = "navbar" }: UserMenuProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const settings = useSettings();

  if (!user) return null;

  const email = user.email ?? "";
  const initial = emailToInitial(email);
  const avatarBg = emailToColor(email);
  const avatarStyle = {
    backgroundColor: avatarBg,
    color: AVATAR_FOREGROUND,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-medium transition hover:opacity-90"
        style={avatarStyle}
        aria-label="Menu konta"
      >
        <span
          className="flex h-7 w-7 items-center justify-center text-sm font-medium"
          style={{ color: AVATAR_FOREGROUND }}
        >
          {initial}
        </span>
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
          <DropdownMenuItem onClick={() => settings.open("credits")}>
            <Gift className="h-4 w-4 text-beige/80" />
            <span className="text-beige/90">Zdobadz darmowe kredyty</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => settings.open("credits")}>
            <CreditCard className="h-4 w-4" />
            Moje kredyty
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
            Wyloguj się
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
