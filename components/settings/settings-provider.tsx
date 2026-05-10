"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { SettingsDialog, type SettingsTabId } from "@/components/settings/settings-dialog";

type SettingsContextValue = {
  open: (tab?: SettingsTabId) => void;
  close: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");

  const open = useCallback((tab?: SettingsTabId) => {
    if (tab) setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ open, close }),
    [open, close],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
      <SettingsDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
