import React, { useMemo, useState } from "react";
import type { OrderDTO } from "../../api/pos/orders";
import { contextLabel, minutesOpen, itemsPreview, euro } from "../../lib/orders/search";
import { useNavigate } from "react-router-dom";
import { usePosSession } from "../../stores/posSessionStore";
import { apiCancelOrder, apiParkOrder } from "../../api/pos/orders";

type Props = {
  order: OrderDTO;
};

export default function OrderCard({ order }: Props) {
  const navigate = useNavigate();
  const { setActiveOrderId } = usePosSession();
  const [busy, setBusy] = useState(false);
  const ctx = useMemo(() => contextLabel(order), [order]);
  const { count, names } = useMemo(() => itemsPreview(order), [order]);
  const mins = useMemo(() => minutesOpen(order), [order]);
  const total = useMemo(() => euro(order.totalInclVatCents), [order.totalInclVatCents]);

  function statusPill() {
    const s = (order.status || "OPEN").toUpperCase();
    const label =
      s === "OPEN" ? "Open" :
      s === "PARKED" ? "Hold" :
      s === "SENT" || s === "IN_PREP" ? "Bevestigd" :
      s === "READY" ? "Gereed" : s;
    const bg =
      s === "OPEN" ? "#d1fae5" :
      s === "PARKED" ? "#f3f4f6" :
      s === "READY" ? "#fde68a" :
      s === "SENT" || s === "IN_PREP" ? "#bfdbfe" : "#e5e7eb";
    const fg =
      s === "OPEN" ? "#065f46" :
      s === "PARKED" ? "#374151" :
      s === "READY" ? "#92400e" :
      s === "SENT" || s === "IN_PREP" ? "#1e40af" : "#374151";
    return <span style={{ background: bg, color: fg, borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>{label}</span>;
  }

  async function onQuick(action: string) {
    try {
      setBusy(true);
      if (action === "open") {
        navigate(`/orders/${order.id}`);
      } else if (action === "continue") {
        setActiveOrderId(order.id);
        navigate("/pos");
      } else if (action === "hold") {
        await apiParkOrder(order.id);
      } else if (action === "unhold") {
        // no explicit unhold — re-open by transitioning? leave as stub
      } else if (action === "cancel") {
        await apiCancelOrder(order.id, "Geannuleerd via dashboard");
      } else if (action === "move" || action === "link" || action === "merge") {
        alert("Actie komt binnenkort beschikbaar");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="order-card"
      onClick={() => navigate(`/orders/${order.id}`)}
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: 12,
        display: "grid",
        gridTemplateColumns: "1.8fr 1.4fr auto",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
      }}
    >
      {/* LEFT */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis" }}>{ctx}</div>
        <div style={{ color: "#6b7280", fontSize: 12 }}>
          Bon {order.receiptLabel || order.id.slice(-6)} • {new Date(order.createdAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} • {mins} min
        </div>
      </div>

      {/* MIDDLE */}
      <div style={{ color: "#374151", fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {count} items • {names.join(", ")}
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
        {statusPill()}
        <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{total}</div>
        <div style={{ position: "relative" }}>
          <button className="btn" disabled={busy} onClick={() => onQuick("open")}>
            …
          </button>
          {/* quick menu: simple inline buttons for now */}
          {/* Future: popover menu */}
        </div>
      </div>
    </div>
  );
}
