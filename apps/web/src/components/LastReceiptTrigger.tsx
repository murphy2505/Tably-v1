import { useState } from "react";
import { apiGetLastCompletedOrder, type OrderDTO } from "../api/pos/orders";

type Props = { variant?: "floating" | "header" };

export default function LastReceiptTrigger({ variant = "floating" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDTO | null>(null);

  async function openModal() {
    setOpen(true);
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const o = await apiGetLastCompletedOrder();
      setOrder(o);
    } catch (_e) {
      setError("Nog geen afgeronde bonnen");
    } finally {
      setLoading(false);
    }
  }

  const triggerClass = variant === "floating" ? "floating-last-receipt" : "bon-link";
  const triggerLabel = "Laatste bon";

  return (
    <>
      <button className={triggerClass} onClick={openModal}>{triggerLabel}</button>
      {open && (
        <div className="checkout-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="checkout-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Laatste bon</div>
              <button className="modal-close" onClick={() => setOpen(false)}>Sluiten</button>
            </div>
            <div className="modal-body">
              {loading && <p>Bezig met laden…</p>}
              {error && <p style={{ color: "#991b1b" }}>{error}</p>}
              {!loading && !error && order && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontWeight: 800 }}>Bon #{order.id.slice(-6)}</div>
                    <div style={{ fontWeight: 900 }}>{formatEuro(order.lines.reduce((s, l) => s + l.qty * l.priceCents, 0))}</div>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    Status: {order.status}
                    {order.completedAt ? ` • Tijd: ${new Date(order.completedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {order.lines.map((l) => (
                      <div key={l.id} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{l.title} <span style={{ color: "#6b7280" }}>{l.qty}×</span></span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatEuro(l.qty * l.priceCents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => console.log("print-last")}>Print</button>
              <button className="btn" onClick={() => console.log("mail-last")}>Mail</button>
              <button className="btn primary" onClick={() => setOpen(false)}>Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}
