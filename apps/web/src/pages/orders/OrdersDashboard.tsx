import React from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/loyalty/StatCard";
import OrderCard from "../../components/orders/OrderCard";
import { useOrders } from "../../lib/orders/useOrders";
import type { OrderFilterKind } from "../../lib/orders/search";

const FILTERS: { key: OrderFilterKind; label: string }[] = [
  { key: "ALLE", label: "Alle" },
  { key: "OPEN", label: "Open" },
  { key: "HOLD", label: "Hold" },
  { key: "CONFIRMED", label: "Bevestigd" },
  { key: "READY", label: "Gereed" },
];

export default function OrdersDashboard() {
  const navigate = useNavigate();
  const { loading, error, search, setSearch, filter, setFilter, stats, filtered, mostRecent, refresh } = useOrders();

  return (
    <div className="page" style={{ padding: 16, background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ margin: 0 }}>Bestellingen</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek bon, tafel, naam, telefoon"
            style={{
              height: 36,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              padding: "0 10px",
              minWidth: 280,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => navigate("/pos")}>Nieuwe bon</button>
          <button className="btn" onClick={() => navigate("/pos/areas")}>Plattegrond</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
        <StatCard title="Open bonnen" value={stats.openCount} />
        <StatCard title="Tafels bezet" value={stats.tablesCount} />
        <StatCard title="Op naam" value={stats.nameCount} />
        <StatCard title="Bevestigd" value={stats.kitchenCount} />
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
            style={{
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: filter === f.key ? "#d1fae5" : "#fff",
              color: filter === f.key ? "#065f46" : "#374151",
              padding: "6px 12px",
            }}
          >
            {f.label}
          </button>
        ))}
        <button className="btn" onClick={refresh} style={{ marginLeft: "auto" }}>Vernieuwen</button>
      </div>

      {/* Main content: two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Open bonnen</div>
            {loading && <div>Bezig met laden…</div>}
            {error && (
              <div style={{ color: "#b91c1c", display: "flex", alignItems: "center", gap: 8 }}>
                <span>Fout: {error}</span>
                <button className="btn" onClick={refresh}>Opnieuw</button>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div style={{ background: "#f3f4f6", borderRadius: 8, padding: 16, textAlign: "center", color: "#6b7280" }}>
                <div style={{ marginBottom: 8 }}>Geen open bestellingen</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                  <button className="btn" onClick={() => navigate("/pos")}>Nieuwe bon</button>
                  <button className="btn" onClick={() => navigate("/pos/areas")}>Plattegrond</button>
                </div>
              </div>
            )}
            {!loading && !error && (
              <div style={{ display: "grid", gap: 8 }}>
                {filtered.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Actief / Recent</div>
            {mostRecent ? (
              <OrderCard order={mostRecent} />
            ) : (
              <div style={{ color: "#6b7280" }}>Geen recente bonnen</div>
            )}
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => navigate("/pos")}>Ga naar actieve bon</button>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Snelle acties</div>
            <div style={{ display: "grid", gap: 6 }}>
              <button className="btn" onClick={() => navigate("/pos/areas")}>Plattegrond openen</button>
              <button className="btn" onClick={() => navigate("/pos")}>Nieuwe bon</button>
              <button className="btn" onClick={() => alert("Klant zoeken — binnenkort beschikbaar")}>Klant zoeken</button>
            </div>
          </div>

          {/* Optional mini kitchen status */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Keuken status</div>
            <div style={{ color: "#374151" }}>Bonnen in keuken: {stats.kitchenCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
