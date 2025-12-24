import React, { useEffect, useMemo, useState } from "react";
import StatCard from "../../components/loyalty/StatCard";
import CustomerList from "../../components/loyalty/CustomerList";
import CustomerCardOverlay from "../../components/customers/CustomerCardOverlay";
import { apiSearchCustomers, type CustomerDTO } from "../../api/loyalty";

export default function LoyaltyDashboard() {
  const [customers, setCustomers] = useState<Array<CustomerDTO & { lastVisit?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CustomerDTO | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiSearchCustomers("", 20); // mock: list recent
        const base = (res.customers || []).map((c, i) => ({
          ...c,
          lastVisit: i < 5 ? new Date(Date.now() - i * 86400000).toLocaleDateString("nl-NL") : null,
        }));
        if (!alive) return;
        setCustomers(base);
      } catch (e) {
        if (!alive) return;
        setError("Kon klanten niet laden");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const kpis = useMemo(() => {
    const totaalKlanten = customers.length;
    const actieveSpaarkaarten = customers.filter((c) => (c.loyalty?.status || "ACTIVE") === "ACTIVE").length;
    const walletSaldoTotaal = 0; // mock for now
    const kadokaartenAantal = 0; // mock for now
    const kadokaartenBedrag = 0; // mock for now
    return {
      totaalKlanten,
      actieveSpaarkaarten,
      walletSaldoTotaal,
      kadokaartenAantal,
      kadokaartenBedrag,
    };
  }, [customers]);

  return (
    <div className="page" style={{ padding: 16, background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Loyalty</h1>
        <button className="btn">Nieuwe klant</button>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard title="Totaal klanten" value={kpis.totaalKlanten} />
        <StatCard title="Actieve spaarkaarten" value={kpis.actieveSpaarkaarten} />
        <StatCard title="Wallet saldo (totaal)" value={`€ ${kpis.walletSaldoTotaal.toFixed(2)}`} />
        <StatCard title="Openstaande kadokaarten" value={kpis.kadokaartenAantal} hint={`€ ${kpis.kadokaartenBedrag.toFixed(2)}`} />
      </div>

      {/* Main content: 2 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Recente klanten</div>
            {loading && <div>Bezig met laden…</div>}
            {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
            {!loading && !error && (
              <CustomerList
                customers={customers}
                onSelect={(cust) => { setSelected(cust); setOverlayOpen(true); }}
              />
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Recente loyalty-activiteit</div>
            <div style={{ display: "grid", gap: 6 }}>
              {["Punten bij", "Punten af", "Punten bij"].map((lbl, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ color: "#374151" }}>{lbl} — Klant {idx + 1}</div>
                  <div style={{ color: "#6b7280" }}>{new Date(Date.now() - idx * 3600000).toLocaleString("nl-NL")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Wallets overzicht</div>
            <div style={{ color: "#374151" }}>Aantal wallets: 0</div>
            <div style={{ color: "#374151" }}>Totaal saldo: € 0,00</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn">Wallets beheren</button>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Kadokaarten</div>
            <div style={{ color: "#374151" }}>Openstaand aantal: 0</div>
            <div style={{ color: "#374151" }}>Openstaand bedrag: € 0,00</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn">Kadokaarten bekijken</button>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Marketing</div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Klanten &gt;30 dagen niet geweest</span>
                <button className="btn">Bekijk</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Klanten met bijna volle spaarkaart</span>
                <button className="btn">Bekijk</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Top vaste klanten</span>
                <button className="btn">Bekijk</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      <CustomerCardOverlay customer={selected} open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </div>
  );
}
