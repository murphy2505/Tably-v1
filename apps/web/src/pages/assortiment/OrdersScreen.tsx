import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders, type Order } from "../../stores/ordersStore";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function totalCentsOf(o: Order): number {
  return o.lines.reduce((s, l) => s + l.qty * l.priceCents, 0);
}
function itemsCountOf(o: Order): number {
  return o.lines.reduce((s, l) => s + l.qty, 0);
}

type Tab = "OPEN" | "PAID";

export default function OrdersScreen() {
  const navigate = useNavigate();
  const { orders, setCurrentOrder, voidOrder, duplicateToNewOpen } = useOrders();
  const [tab, setTab] = useState<Tab>("OPEN");

  const list = useMemo(() => {
    const filtered = orders.filter((o) => (tab === "OPEN" ? o.status === "OPEN" : o.status === "PAID"));
    return filtered.sort((a, b) => {
      const ta = tab === "OPEN" ? a.createdAt : (a.paidAt ?? a.createdAt);
      const tb = tab === "OPEN" ? b.createdAt : (b.paidAt ?? b.createdAt);
      return tb - ta;
    });
  }, [orders, tab]);

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

      <div className="orders-tabs">
        <button className={`orders-tab ${tab === "OPEN" ? "active" : ""}`} onClick={() => setTab("OPEN")}>
          Open
        </button>
        <button className={`orders-tab ${tab === "PAID" ? "active" : ""}`} onClick={() => setTab("PAID")}>
          Afgehandeld
        </button>
      </div>

      <div className="orders-list">
        {list.length === 0 ? (
          <div className="orders-empty">Geen bonnen in deze lijst.</div>
        ) : (
          list.map((o) => {
            const total = totalCentsOf(o);
            const items = itemsCountOf(o);
            const time = tab === "OPEN" ? formatTime(o.createdAt) : formatTime(o.paidAt ?? o.createdAt);

            return (
              <div className="order-card" key={o.id}>
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
                      <span className={`order-pill ${o.status.toLowerCase()}`}>
                        {o.status === "PAID" ? "Afgehandeld" : o.status === "VOID" ? "Void" : "Open"}
                      </span>
                    </div>
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

                <div className="order-card-actions">
                  {o.status === "OPEN" ? (
                    <>
                      <button
                        className="btn primary"
                        onClick={() => {
                          setCurrentOrder(o.id);
                          navigate("/pos");
                        }}
                      >
                        Open
                      </button>
                      <button className="btn danger" onClick={() => voidOrder(o.id)}>Void</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn primary"
                        onClick={() => {
                          const newId = duplicateToNewOpen(o.id);
                          setCurrentOrder(newId);
                          navigate("/pos");
                        }}
                      >
                        Heropen
                      </button>
                      <button className="btn" onClick={() => console.log("details", o.id)}>
                        Details
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
