import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type UiContextValue = {
  // Legacy card overlay (kept for compatibility if referenced)
  customerCardOpen: boolean;
  customerCardCustomerId: string | null;
  openCustomerCard: (customerId?: string) => void;
  closeCustomerCard: () => void;

  // New unified panel overlay with modes
  customerPanelOpen: boolean;
  customerPanelMode: "SELECT" | "CARD";
  customerPanelCustomerId: string | null;
  openCustomerPanel: (mode?: "SELECT" | "CARD", customerId?: string | null) => void;
  closeCustomerPanel: () => void;
};

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [customerCardOpen, setCustomerCardOpen] = useState(false);
  const [customerCardCustomerId, setCustomerCardCustomerId] = useState<string | null>(null);

  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);
  const [customerPanelMode, setCustomerPanelMode] = useState<"SELECT" | "CARD">("SELECT");
  const [customerPanelCustomerId, setCustomerPanelCustomerId] = useState<string | null>(null);

  const openCustomerCard = (customerId?: string) => {
    setCustomerCardCustomerId(customerId ?? null);
    setCustomerCardOpen(true);
  };

  const closeCustomerCard = () => {
    setCustomerCardOpen(false);
    setCustomerCardCustomerId(null);
  };

  const openCustomerPanel = (mode?: "SELECT" | "CARD", customerId?: string | null) => {
    setCustomerPanelMode(mode ?? "SELECT");
    setCustomerPanelCustomerId(customerId ?? null);
    setCustomerPanelOpen(true);
  };

  const closeCustomerPanel = () => {
    setCustomerPanelOpen(false);
    setCustomerPanelCustomerId(null);
  };

  const value = useMemo<UiContextValue>(() => ({
    customerCardOpen,
    customerCardCustomerId,
    openCustomerCard,
    closeCustomerCard,
    customerPanelOpen,
    customerPanelMode,
    customerPanelCustomerId,
    openCustomerPanel,
    closeCustomerPanel,
  }), [customerCardOpen, customerCardCustomerId, customerPanelOpen, customerPanelMode, customerPanelCustomerId]);

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}
