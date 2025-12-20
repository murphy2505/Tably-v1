import { useEffect, useRef, useState } from "react";
import { apiTransitionOrder, type OrderDTO } from "../api/pos/orders";
import http from "../services/http";

function tenantId() {
  return (import.meta as any).env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

async function fetchTickets(status: "SENT" | "IN_PREP" | "READY") {
  const res = await http.get<{ orders: OrderDTO[] }>(`/core/kds/tickets?status=${status}`, { headers: { "x-tenant-id": tenantId() } });
  return res.data.orders;
}

export default function KdsScreen() {
  const [sent, setSent] = useState<OrderDTO[]>([]);
  const [inPrep, setInPrep] = useState<OrderDTO[]>([]);
  const [ready, setReady] = useState<OrderDTO[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [checkedLines, setCheckedLines] = useState<Map<string, Set<string>>>(new Map());
  const [tick, setTick] = useState<number>(Date.now());

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const iv = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const backoffRef = useRef(1000);

  async function loadAll() {
    const [a, b, c] = await Promise.all([fetchTickets("SENT"), fetchTickets("IN_PREP"), fetchTickets("READY")]);
    setSent(a);
    setInPrep(b);
    setReady(c);
    setCheckedLines((prev) => {
      const keepIds = new Set([...a, ...b, ...c].map((o) => o.id));
      const next = new Map(prev);
      for (const id of next.keys()) {
        if (!keepIds.has(id)) next.delete(id);
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    loadAll().catch(() => {});

    function connect() {
      if (cancelled) return;
      es = new EventSource(`/api/core/kds/stream?tenantId=${encodeURIComponent(tenantId())}`);
      es.addEventListener("order", () => {
        loadAll().catch(() => {});
      });
      es.onerror = () => {
        try {
          es && es.close();
        } catch {}
        const wait = backoffRef.current;
        backoffRef.current = Math.min(wait * 2, 5000);
        setTimeout(() => {
          if (!cancelled) connect();
        }, wait);
      };
    }

    connect();
    return () => {
      cancelled = true;
      try {
        es && es.close();
      } catch {}
    };
  }, []);

  async function act(id: string, to: "IN_PREP" | "READY" | "COMPLETED") {
    try {
      setActing(id + ":" + to);
      await apiTransitionOrder(id, to as any);
      await loadAll();
    } catch (e) {
      console.warn("kds transition failed", e);
      setToast("Actie mislukt");
    } finally {
      setActing(null);
    }
  }

  function toggleLine(orderId: string, lineId: string) {
    setCheckedLines((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(orderId) ?? []);
      if (set.has(lineId)) set.delete(lineId);
      else set.add(lineId);
      next.set(orderId, set);
      return next;
    });
  }

  function checkAll(orderId: string, lines: { id: string }[]) {
    setCheckedLines((prev) => {
      const next = new Map(prev);
      next.set(orderId, new Set(lines.map((l) => l.id)));
      return next;
    });
  }

  function resetAll(orderId: string) {
    setCheckedLines((prev) => {
      const next = new Map(prev);
      next.set(orderId, new Set());
      return next;
    });
  }

  return (
    <div className="kds-screen" style={{ padding: 12 }}>
      {toast && (
        <div style={{ position: "fixed", right: 16, bottom: 16, background: "#111827", color: "white", padding: "10px 14px", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,0.25)", zIndex: 1001 }}>{toast}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Column title="Nieuw" orders={sent} actionLabel="Start" onAction={(id) => act(id, "IN_PREP")} acting={acting} checkedLines={checkedLines} onToggle={toggleLine} onCheckAllOrder={(orderId, lines) => checkAll(orderId, lines)} onResetAllOrder={(orderId) => resetAll(orderId)} tick={tick} />
        <Column title="Bezig" orders={inPrep} actionLabel="Klaar" onAction={(id) => act(id, "READY")} acting={acting} checkedLines={checkedLines} onToggle={toggleLine} onCheckAllOrder={(orderId, lines) => checkAll(orderId, lines)} onResetAllOrder={(orderId) => resetAll(orderId)} tick={tick} />
        <Column title="Klaar" orders={ready} actionLabel="Afgehaald" onAction={(id) => act(id, "COMPLETED")} acting={acting} checkedLines={checkedLines} onToggle={toggleLine} onCheckAllOrder={(orderId, lines) => checkAll(orderId, lines)} onResetAllOrder={(orderId) => resetAll(orderId)} tick={tick} />
      </div>
    </div>
  );
}

function Column({ title, orders, actionLabel, onAction, acting, checkedLines, onToggle, onCheckAllOrder, onResetAllOrder, tick }: { title: string; orders: OrderDTO[]; actionLabel: string | null; onAction: (id: string) => void; acting: string | null; checkedLines: Map<string, Set<string>>; onToggle: (orderId: string, lineId: string) => void; onCheckAllOrder: (orderId: string, lines: { id: string }[]) => void; onResetAllOrder: (orderId: string) => void; tick: number; }) {
  return (
    <div className="kds-col">
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {orders.map((o) => {
          const total = o.lines.reduce((s, l) => s + l.qty * l.priceCents, 0);
          const checked = checkedLines.get(o.id) ?? new Set<string>();
          const baseTimeStr = (o as any).sentAt ?? o.createdAt;
          const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(baseTimeStr).getTime()) / 60000));
          const allChecked = o.lines.length > 0 && o.lines.every((l) => checked.has(l.id));
          return (
            <div key={o.id} className="order-card">
              <div className="order-card-main">
                <div className="order-card-row" style={{ justifyContent: "space-between" }}>
                  <div className="order-card-left">
                    <div className="order-card-id">Bon #{o.id.slice(-6)}</div>
                    <div className="order-card-meta">
                      <span>{new Date(o.createdAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>•</span>
                      <span>{o.lines.reduce((s, l) => s + l.qty, 0)} items</span>
                    </div>
                  </div>
                  <div className="order-card-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="order-card-total">{formatEuro(total)}</div>
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "#e5e7eb", color: "#111827", fontSize: 12 }}>{elapsedMin}m</span>
                    <button className="btn" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => (allChecked ? onResetAllOrder(o.id) : onCheckAllOrder(o.id, o.lines))}>
                      {allChecked ? "Reset" : "Alles"}
                    </button>
                  </div>
                </div>
                <div className="order-card-lines">
                  {o.lines.map((l) => {
                    const isChecked = checked.has(l.id);
                    return (
                      <button
                        type="button"
                        key={l.id}
                        className="order-card-line"
                        onClick={() => onToggle(o.id, l.id)}
                        style={{ display: "flex", alignItems: "center", gap: 8, opacity: isChecked ? 0.5 : 1 }}
                      >
                        <span style={{ width: 16, height: 16, border: "2px solid #9ca3af", borderRadius: 3, background: isChecked ? "#10b981" : "transparent" }} />
                        <span className="line-qty">{l.qty}×</span>
                        <span className="line-title">{l.title}</span>
                      </button>
                    );
                  })}
                </div>
                {actionLabel && (
                  <div className="order-actions" style={{ marginTop: 8 }}>
                    <button className="btn primary" onClick={() => onAction(o.id)} disabled={acting === o.id + ":IN_PREP" || acting === o.id + ":READY" || acting === o.id + ":COMPLETED"}>
                      {actionLabel}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {orders.length === 0 && <div style={{ color: "#6b7280" }}>—</div>}
      </div>
    </div>
  );
}
