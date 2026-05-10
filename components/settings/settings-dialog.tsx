"use client";

import {
  Cloud,
  CreditCard,
  Lightbulb,
  Plug,
  Settings as SettingsIcon,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { GeneralTab } from "@/components/settings/tabs/general-tab";
import { CreditsTab } from "@/components/settings/tabs/credits-tab";
import { ApplicationsTab } from "@/components/settings/tabs/applications-tab";
import { CloudTab } from "@/components/settings/tabs/cloud-tab";
import { KnowledgeTab } from "@/components/settings/tabs/knowledge-tab";
import { ConnectorsTab } from "@/components/settings/tabs/connectors-tab";
import { AddOnsTab } from "@/components/settings/tabs/addons-tab";

export type SettingsTabId =
  | "general"
  | "credits"
  | "applications"
  | "cloud"
  | "knowledge"
  | "connectors"
  | "addons";

const TABS: {
  id: SettingsTabId;
  label: string;
  icon: typeof SettingsIcon;
}[] = [
  { id: "general", label: "Ogolne", icon: SettingsIcon },
  { id: "credits", label: "Kredyty", icon: CreditCard },
  { id: "applications", label: "Aplikacje", icon: Plug },
  { id: "cloud", label: "Cloud", icon: Cloud },
  { id: "knowledge", label: "Wiedza", icon: Lightbulb },
  { id: "connectors", label: "Konektory (MCP)", icon: Users },
  { id: "addons", label: "Dodatki", icon: Sparkles },
];

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
};

export function SettingsDialog({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-beige/15 bg-card p-0 sm:max-w-[960px]">
        <div className="flex h-[640px] max-h-[85vh]">
          <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-beige/10 bg-background/40 p-3">
            <DialogTitle className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ustawienia konta
            </DialogTitle>
            <DialogDescription className="sr-only">
              Konfiguracja konta i integracji wybitnastrona.pl
            </DialogDescription>
            <nav className="mt-1 flex flex-col gap-0.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                      isActive
                        ? "bg-beige/10 text-beige"
                        : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {activeTab === "general" && <GeneralTab />}
            {activeTab === "credits" && <CreditsTab />}
            {activeTab === "applications" && <ApplicationsTab />}
            {activeTab === "cloud" && <CloudTab />}
            {activeTab === "knowledge" && <KnowledgeTab />}
            {activeTab === "connectors" && <ConnectorsTab />}
            {activeTab === "addons" && <AddOnsTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
