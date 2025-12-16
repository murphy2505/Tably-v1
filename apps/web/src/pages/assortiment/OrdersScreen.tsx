import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePosSession } from "../../stores/posSessionStore";
import { apiListOrders, type OrderDTO, type OrderStatus } from "../../api/pos/orders";
import OrderDetailPanel from "../../components/orders/OrderDetailPanel";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function totalCentsOf(o: OrderDTO): number {
  return o.lines.reduce((s, l) => s + l.qty * l.priceCents, 0);
}
function itemsCountOf(o: OrderDTO): number {
  return o.lines.reduce((s, l) => s + l.qty, 0);
}

const STATUSES: OrderStatus[] = ["OPEN", "SENT", "IN_PREP", "READY", "COMPLETED", "CANCELLED"];

export default function OrdersScreen() {
  const navigate = useNavigate();
  const { setActiveOrderId } = usePosSession();
  const [status, setStatus] = useState<OrderStatus>("OPEN");
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiListOrders({ status });
      setOrders(res.orders);
      // keep selection if still visible
      if (selectedOrderId && !res.orders.some((o) => o.id === selectedOrderId)) {
        setSelectedOrderId(null);
      }
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Kon bonnen niet laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="orders-screen">
      <div className="orders-topbar">
        <div className="orders-title">
          <div style={{ fontWeight: 900, fontSize: 16 }}>Bestellingen</div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>Open en afgehandelde bonnen</div>
        </div>

        <div className="orders-top-actions">
          <button className="btn" onClick={() => navigate("/pos")}>Terug</button>
        </div>
      </div>

      <div className="orders-tabs" style={{ flexWrap: "wrap" }}>
        {STATUSES.map((s) => (
          <button key={s} className={`orders-tab ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(320px, 480px)", gap: 12, alignItems: "start", padding: 12 }}>
        <div className="orders-list">
          {loading && <div>Bezig met laden…</div>}
          {error && <div className="orders-empty" style={{ color: "#991b1b" }}>{error}</div>}
          {!loading && !error && orders.length === 0 ? (
          <div className="orders-empty">Geen bonnen in deze lijst.</div>
          ) : (
          orders.map((o) => {
            const total = totalCentsOf(o);
            const items = itemsCountOf(o);
            const timeIso = o.completedAt || o.cancelledAt || o.createdAt;
            const time = new Date(timeIso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

            return (
              <div className="order-card" key={o.id} onClick={() => setSelectedOrderId(o.id)} style={{ cursor: "pointer" }}>
                <div className="order-card-main">
                  <div className="order-card-row">
                    <div className="order-card-left">
                      <div className="order-card-id">Bon #{o.id.slice(-6)}</div>
                      <div className="order-card-meta">
                        <span>{time}</span>
                        <span>•</span>
                        <span>{items} items</span>
                      </div>
                    </div>

                    <div className="order-card-right">
                      <div className="order-card-total">{formatEuro(total)}</div>
                      <span className={`order-pill ${o.status.toLowerCase()}`}>{statusLabel(o.status)}</span>
                    </div>
                  </div>
                  <div className="order-actions">
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveOrderId(o.id);
                        navigate("/pos");
                      }}
                    >
                      Zet op kassa
                    </button>
                  </div>

                  {o.lines.length > 0 && (
                    <div className="order-card-lines">
                      {o.lines.slice(0, 3).map((l) => (
                        <div className="order-card-line" key={l.id}>
                          <span className="line-title">{l.title}</span>
                          <span className="line-qty">{l.qty}×</span>
                        </div>
                      ))}
                      {o.lines.length > 3 && <div className="order-card-more">+ {o.lines.length - 3} regels</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
        <OrderDetailPanel orderId={selectedOrderId} onChanged={load} />
      </div>
    </div>
  );
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
