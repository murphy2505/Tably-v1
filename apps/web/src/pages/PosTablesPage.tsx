import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGetFloorplan, apiListTables, apiOpenOrAssignOrderToTable, type TableDTO } from "../api/pos/tables";
import { usePosSession } from "../stores/posSessionStore";

export default function PosTablesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeOrderId, setActiveOrderId } = usePosSession();
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [fp, tl] = await Promise.all([apiGetFloorplan(), apiListTables(activeOrderId || undefined)]);
        if (!cancelled) {
          setTables(tl.tables || []);
          const l = Array.isArray(fp.floorplan?.layoutJson) ? fp.floorplan.layoutJson : [];
          setLayout(l);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Kon tafels niet laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeOrderId]);

  const layoutById = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of layout || []) if (b?.id) m.set(String(b.id), b);
    return m;
  }, [layout]);

  async function handleClickTable(t: TableDTO) {
    try {
      const params = new URLSearchParams(location.search);
      const pickForOrder = params.get("pickForOrder");
      const returnTo = params.get("returnTo") || "/pos";
      if (pickForOrder) {
        navigate(`${returnTo}?pickForOrder=${encodeURIComponent(pickForOrder)}&pickedTableId=${encodeURIComponent(t.id)}`, { replace: true });
        return;
      }
      if (t.openOrderId) {
        setActiveOrderId(t.openOrderId);
        navigate("/pos");
        return;
      }
      const res = await apiOpenOrAssignOrderToTable(t.id);
      const orderId = res?.order?.id as string;
      if (orderId) {
        setActiveOrderId(orderId);
        navigate("/pos");
      }
    } catch (e) {
      // ignore for MVP
    }
  }

  const hasLayout = (layout || []).length > 0;

  return (
    <div className="page" style={{ padding: 16 }}>
      <h1>Tafels</h1>
      {loading && <p>Tafels laden…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!hasLayout && tables.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <p>Geen tafels gevonden. Voeg tafels toe via Instellingen → Hardware → Tafels.</p>
          <button className="btn" onClick={() => navigate("/settings/hardware/tables")}>Ga naar Tafels instellingen</button>
        </div>
      ) : hasLayout ? (
        <div style={{ position: "relative", minHeight: 500, border: "1px dashed #ddd", borderRadius: 12 }}>
          {tables.map((t) => {
            const b = layoutById.get(t.id) || { x: 16, y: 16, w: 100, h: 80 };
            const color = t.status === "ACTIVE" ? "#10b981" : t.status === "BUSY" ? "#f59e0b" : "#e5e7eb";
            const text = t.name || "T";
            return (
              <button key={t.id} onClick={() => handleClickTable(t)}
                className="table-tile"
                style={{ position: "absolute", left: b.x || 0, top: b.y || 0, width: b.w || 110, height: b.h || 84, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", padding: 8 }}
              >
                <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                  <div style={{ fontWeight: 800 }}>{text}</div>
                  <div style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: color, color: t.status === "FREE" ? "#111827" : "white" }}>{t.status === "FREE" ? "Vrij" : t.status === "BUSY" ? "Bezet" : "Actief"}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {tables.map((t) => {
            const color = t.status === "ACTIVE" ? "#10b981" : t.status === "BUSY" ? "#f59e0b" : "#e5e7eb";
            return (
              <button key={t.id} className="table-card" onClick={() => handleClickTable(t)} style={{ borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", padding: 14, display: "grid", gap: 6, justifyItems: "start" }}>
                <div style={{ fontWeight: 800 }}>{t.name}</div>
                <div style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: color, color: t.status === "FREE" ? "#111827" : "white", width: "fit-content" }}>{t.status === "FREE" ? "Vrij" : t.status === "BUSY" ? "Bezet" : "Actief"}</div>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => navigate("/settings/floorplan")}>Plattegrond bewerken</button>
        <button className="btn" onClick={() => navigate("/pos?booking=1")}>Boek op …</button>
      </div>
    </div>
  );
}
