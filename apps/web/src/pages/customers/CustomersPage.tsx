import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiListOrders, type OrderDTO, type OrderStatus } from "../../api/pos/orders";
import { Search } from "lucide-react";

export default function CustomersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const params = new URLSearchParams(location.search);
  const pickForOrder = params.get("pickForOrder") || null;
  const returnTo = params.get("returnTo") || "/pos";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const statuses: OrderStatus[] = ["OPEN", "PARKED", "SENT", "IN_PREP", "READY"];
        const bucket: OrderDTO[] = [];
        for (const s of statuses) {
          const res = await apiListOrders({ status: s });
          for (const o of res.orders || []) bucket.push(o);
        }
        if (!alive) return;
        const nameOrders = bucket.filter((o) => !!o.customer);
        // sort recent first
        nameOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(nameOrders);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return orders.filter((o) => {
      const name = (o.customer?.name || o.customer?.phoneE164 || o.customer?.id || "").toLowerCase();
      return !qq || name.includes(qq);
    });
  }, [orders, q]);

  return (
    <div className="page" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Customers</h1>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <Search size={16} />
          <input className="orders-search" placeholder="Zoek klant…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {pickForOrder && (
        <div style={{ display: "grid", gap: 8, marginBottom: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 800 }}>Kies klant voor bon</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="orders-search" placeholder="Klant-ID of telefoon" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn" onClick={() => {
              const id = q.trim();
              if (!id) return;
              navigate(`${returnTo}?pickForOrder=${encodeURIComponent(pickForOrder)}&pickedCustomerId=${encodeURIComponent(id)}`, { replace: true });
            }}>Selecteer</button>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Of klik een bestaande op-naam bon hieronder om deze klant te kiezen.</div>
        </div>
      )}
      {loading && <p>Openstaande op-naam bonnen laden…</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((o) => (
          <button key={o.id} className="order-row" onClick={() => {
            const cid = o.customer?.id;
            if (pickForOrder && cid) {
              navigate(`${returnTo}?pickForOrder=${encodeURIComponent(pickForOrder)}&pickedCustomerId=${encodeURIComponent(cid)}`, { replace: true });
            } else {
              navigate(`/orders/${o.id}`);
            }
          }}>
            <div className="order-row-title">{o.customer?.name || o.customer?.phoneE164 || o.customer?.id}</div>
            <div className="order-row-meta">Bon {o.draftLabel || o.receiptLabel || o.id.slice(-6)}</div>
          </button>
        ))}
        {!loading && filtered.length === 0 && (
          <div style={{ color: "#6b7280" }}>Geen openstaande op-naam bonnen gevonden.</div>
        )}
      </div>
    </div>
  );
}
