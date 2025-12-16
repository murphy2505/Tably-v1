import { createContext, useContext, useMemo, useState, createElement, type ReactNode } from "react";

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

	return createElement(PosSessionContext.Provider, { value }, children as any);
}

export function usePosSession() {
	const ctx = useContext(PosSessionContext);
	if (!ctx) throw new Error("usePosSession must be used within PosSessionProvider");
	return ctx;
}
