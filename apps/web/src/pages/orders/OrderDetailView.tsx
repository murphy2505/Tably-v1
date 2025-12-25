import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGetOrder, apiTransitionOrder, apiCancelOrder, type OrderDTO } from "../../api/pos/orders";
import { contextLabel, euro } from "../../lib/orders/search";
import { usePosSession } from "../../stores/posSessionStore";

export default function OrderDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveOrderId } = usePosSession();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!id) return;
    setLoading(true);
    setError(null);
    apiGetOrder(id)
      .then((o) => { if (alive) setOrder(o); })
      .catch(() => alive && setError("Kon bon niet laden"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  const ctx = useMemo(() => (order ? contextLabel(order) : "Bon"), [order]);
  const total = useMemo(() => euro(order?.totalInclVatCents || 0), [order]);

  async function sendToKitchen() {
    if (!order) return;
    try {
      setActing("kitchen");
      await apiTransitionOrder(order.id, "SENT");
      const fresh = await apiGetOrder(order.id);
      setOrder(fresh);
    } finally { setActing(null); }
  }

  async function cancel() {
    if (!order) return;
    try {
      setActing("cancel");
      await apiCancelOrder(order.id, "Geannuleerd via detail");
      const fresh = await apiGetOrder(order.id);
      setOrder(fresh);
    } finally { setActing(null); }
  }

  return (
    <div className="page" style={{ background: "#f9fafb", minHeight: "100vh", display: "grid", gridTemplateRows: "auto 1fr" }}>
      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800 }}>{ctx}</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>Bon {id?.slice(-6)}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => navigate(-1)}>Terug</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        {/* Actions */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {/* 2026: Confirmation flow */}
            {order && (order.status === "OPEN" || order.status === "PARKED") && (
              <button className="btn primary" disabled={!!acting} onClick={sendToKitchen}>Bevestigen & Start</button>
            )}
            <button className="btn" onClick={() => { if (id) { setActiveOrderId(id); navigate("/pos"); } }}>Verder bestellen</button>
            <button className="btn success" onClick={() => id && navigate("/checkout", { state: { orderId: id } })} disabled={!order || (order.lines || []).length === 0}>Betaal</button>
            <button className="btn danger" disabled={!!acting} onClick={cancel}>Annuleren</button>
            <button className="btn" onClick={() => navigate("/orders")}>Terug naar Bestellingen</button>
          </div>
        </div>

        {/* Lines */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
          {loading && <div>Bezig met laden…</div>}
          {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
          {order && (
            <div style={{ display: "grid", gap: 8 }}>
              {(order.lines || []).map((l) => (
                <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
                  <span>{l.title}</span>
                  <span>{l.qty}×</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{euro(l.qty * l.priceCents)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span>Totaal</span>
                <span>{total}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
