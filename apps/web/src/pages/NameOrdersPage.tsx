import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiListOrders, type OrderDTO, type OrderStatus } from "../api/pos/orders";
import { usePosSession } from "../stores/posSessionStore";

export default function NameOrdersPage() {
  const navigate = useNavigate();
  const { setActiveOrderId } = usePosSession();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiListOrders({ status: "OPEN" as OrderStatus });
        if (!alive) return;
        const withCustomer = (res.orders || []).filter((o) => !!o.customer);
        setOrders(withCustomer);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = orders.filter((o) => {
    const name = (o.customer?.name || o.customer?.phoneE164 || o.customer?.id || "").toLowerCase();
    const qq = q.trim().toLowerCase();
    return !qq || name.includes(qq);
  });

  return (
    <div className="page" style={{ padding: 16 }}>
      <h1>Op Naam</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input className="orders-search" placeholder="Zoek naam…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading && <p>Openstaande op-naam bonnen laden…</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((o) => (
          <button key={o.id} className="order-row" onClick={() => { setActiveOrderId(o.id); navigate("/pos"); }}>
            <div className="order-row-title">{o.customer?.name || o.customer?.phoneE164 || o.customer?.id}</div>
            <div className="order-row-meta">Bon {o.draftLabel || o.receiptLabel || o.id}</div>
          </button>
        ))}
        {!loading && filtered.length === 0 && (
          <div style={{ color: "#6b7280" }}>Geen openstaande op-naam bonnen gevonden.</div>
        )}
      </div>
    </div>
  );
}
