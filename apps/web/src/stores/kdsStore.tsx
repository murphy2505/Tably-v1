import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import http from "../services/http";

function tenantId() {
  return (import.meta as any).env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
}

type KdsValue = {
  sentCount: number | null;
  lastEventAt: number | null;
  refreshCounts: (force?: boolean) => Promise<void>;
  start: () => void;
  stop: () => void;
};

const KdsContext = createContext<KdsValue | null>(null);

export function KdsProvider({ children }: { children: ReactNode }) {
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  const lastFetchRef = useRef(0);
  const backoffRef = useRef(1000);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refreshCounts(force = false) {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 1000) return;
    lastFetchRef.current = now;
    try {
      const res = await http.get<{ orders: { id: string }[] }>(`/core/kds/tickets?status=SENT`, { headers: { "x-tenant-id": tenantId() } });
      setSentCount(res.data.orders.length);
    } catch {
      setSentCount(null);
    }
  }

  function cleanup() {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    try {
      esRef.current?.close();
    } catch {}
    esRef.current = null;
  }

  function connect() {
    cleanup();
    const es = new EventSource(`/pos-api/core/kds/stream?tenantId=${encodeURIComponent(tenantId())}`);
    esRef.current = es;
    es.addEventListener("order", () => {
      setLastEventAt(Date.now());
      refreshCounts(false);
    });
    es.onerror = () => {
      cleanup();
      const wait = backoffRef.current;
      backoffRef.current = Math.min(wait * 2, 5000);
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, wait);
    };
  }

  function start() {
    if (esRef.current) return;
    backoffRef.current = 1000;
    refreshCounts(true);
    connect();
  }

  function stop() {
    cleanup();
  }

  const value: KdsValue = useMemo(() => ({ sentCount, lastEventAt, refreshCounts, start, stop }), [sentCount, lastEventAt]);

  return <KdsContext.Provider value={value}>{children}</KdsContext.Provider>;
}

export function useKds() {
  const ctx = useContext(KdsContext);
  if (!ctx) throw new Error("useKds must be used within KdsProvider");
  return ctx;
}
