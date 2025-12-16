import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PosSessionValue = {
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;
  clearActiveOrder: () => void;
};

const PosSessionContext = createContext<PosSessionValue | null>(null);

export function PosSessionProvider({ children }: { children: ReactNode }) {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const clearActiveOrder = () => setActiveOrderId(null);

  const value = useMemo(
    () => ({ activeOrderId, setActiveOrderId, clearActiveOrder }),
    [activeOrderId]
  );

  return <PosSessionContext.Provider value={value}>{children}</PosSessionContext.Provider>;
}

export function usePosSession() {
  const ctx = useContext(PosSessionContext);
  if (!ctx) throw new Error("usePosSession must be used within PosSessionProvider");
  return ctx;
}
