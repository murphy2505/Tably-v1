import { useEffect, useMemo, useState } from "react";
import { apiGetOrder, apiTransitionOrder, type OrderDTO, type OrderStatus } from "../../api/pos/orders";
import { usePosSession } from "../../stores/posSessionStore";

type Props = {
  orderId: string | null;
  onClose?: () => void;
  onChanged?: () => void;
};

const transitions: Record<OrderStatus, OrderStatus[]> = {
  OPEN: ["SENT", "CANCELLED"],
  SENT: ["IN_PREP", "CANCELLED"],
  IN_PREP: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export default function OrderDetailPanel({ orderId, onClose, onChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [acting, setActing] = useState<OrderStatus | null>(null);
  const { activeOrderId, clearActiveOrder } = usePosSession();

  useEffect(() => {
    let active = true;
    if (!orderId) {
      setOrder(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiGetOrder(orderId)
      .then((o) => {
        if (!active) return;
        setOrder(o);
      })
      .catch((e) => {
        if (!active) return;
        setError(typeof e?.message === "string" ? e.message : "Kon bon niet laden");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [orderId]);

  const totalCents = useMemo(() => (order ? order.lines.reduce((s, l) => s + l.qty * l.priceCents, 0) : 0), [order]);

  async function doTransition(next: OrderStatus) {
    if (!order) return;
    try {
      setActing(next);
      await apiTransitionOrder(order.id, next);
      const fresh = await apiGetOrder(order.id);
      setOrder(fresh);
      onChanged?.();
      if (next === "SENT" && activeOrderId === order.id) {
        clearActiveOrder();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message === "INVALID_TRANSITION" ? "Ongeldige overgang" : "Actie mislukt";
      setError(msg);
    } finally {
      setActing(null);
    }
  }

  if (!orderId) {
    return (
      <div style={{ borderLeft: "1px solid #e5e7eb", padding: 12 }}>
        <div style={{ color: "#6b7280" }}>Selecteer een bon.</div>
      </div>
    );
  }

  return (
    <div style={{ borderLeft: "1px solid #e5e7eb", padding: 12, display: "grid", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>Bon #{orderId.slice(-6)}</div>
        {onClose && (
          <button className="btn" onClick={onClose} style={{ height: 32 }}>Sluiten</button>
        )}
      </div>

      {loading && <div>Bezig met laden…</div>}
      {error && <div style={{ color: "#991b1b" }}>{error}</div>}

      {order && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`order-pill ${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
            {order.status === "SENT" && <span className="order-pill">Naar keuken verzonden</span>}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {order.createdAt && <span>Aangemaakt: {ts(order.createdAt)}</span>}
            {order.sentAt && <span>Verzonden: {ts(order.sentAt)}</span>}
            {order.inPrepAt && <span>In bereiding: {ts(order.inPrepAt)}</span>}
            {order.readyAt && <span>Klaar: {ts(order.readyAt)}</span>}
            {order.completedAt && <span>Afgerond: {ts(order.completedAt)}</span>}
            {order.cancelledAt && <span>Geannuleerd: {ts(order.cancelledAt)}</span>}
          </div>

          <div className="order-card-lines">
            {order.lines.map((l) => (
              <div key={l.id} className="order-card-line">
                <span className="line-title">{l.title}</span>
                <span className="line-qty">{l.qty}×</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatEuro(l.qty * l.priceCents)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
            <span>Totaal</span>
            <span className="order-card-total">{formatEuro(totalCents)}</span>
          </div>

          <div className="order-card-actions" style={{ justifyContent: "flex-start" }}>
            {transitions[order.status].map((next) => (
              <button
                key={next}
                className={
                  next === "CANCELLED" ? "btn danger" : next === "COMPLETED" ? "btn success" : "btn primary"
                }
                disabled={!!acting}
                onClick={() => doTransition(next)}
              >
                {actionLabel(next)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function ts(iso: string) {
  try {
    return new Date(iso).toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function statusLabel(s: OrderStatus) {
  if (s === "OPEN") return "Open";
  if (s === "SENT") return "Verzonden";
  if (s === "IN_PREP") return "In bereiding";
  if (s === "READY") return "Klaar";
  if (s === "COMPLETED") return "Afgerond";
  if (s === "CANCELLED") return "Geannuleerd";
  return s;
}

function actionLabel(s: OrderStatus) {
  if (s === "SENT") return "Verzend naar keuken";
  if (s === "IN_PREP") return "Start bereiding";
  if (s === "READY") return "Markeer klaar";
  if (s === "COMPLETED") return "Afronden";
  if (s === "CANCELLED") return "Annuleer";
  return s;
}
