import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetFloorplan, apiListTables, apiOpenOrAssignOrderToTable, apiSaveFloorplan, apiUpdateTable, type TableDTO } from "../api/pos/tables";
import { usePosSession } from "../stores/posSessionStore";

export default function AreasPage() {
  const navigate = useNavigate();
  const { activeOrderId, setActiveOrderId } = usePosSession();
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [tab, setTab] = useState<"Binnen" | "Buiten" | "Webshop">("Binnen");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [areaSavingId, setAreaSavingId] = useState<string | null>(null);

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

  const byArea = useMemo(() => {
    const groups: Record<string, TableDTO[]> = { Binnen: [], Buiten: [], Webshop: [] };
    for (const t of tables) {
      const area = (t.area || "").trim();
      if (area.toLowerCase() === "buiten") groups.Buiten.push(t);
      else if (area.toLowerCase() === "webshop") groups.Webshop.push(t);
      else groups.Binnen.push(t);
    }
    return groups;
  }, [tables]);

  async function handleClickTable(t: TableDTO) {
    try {
      if (t.openOrderId) {
        setActiveOrderId(t.openOrderId);
        navigate("/pos");
        return;
      }
      const data = await apiOpenOrAssignOrderToTable(t.id);
      const orderId = data?.order?.id as string;
      if (orderId) {
        setActiveOrderId(orderId);
        navigate("/pos");
      }
    } catch (e) {
      // ignore for MVP
    }
  }

  // Drag handling within active area
  const canvasId = "canvas";
  function blocksForArea(areaKey: "Binnen" | "Buiten") {
    const ids = new Set((areaKey === "Binnen" ? byArea.Binnen : byArea.Buiten).map((t) => t.id));
    return (layout || []).filter((b) => ids.has(String(b.id)));
  }

  function setBlockPosition(id: string, x: number, y: number) {
    setLayout((prev) => prev.map((b) => (String(b.id) === String(id) ? { ...b, x, y } : b)));
  }

  async function saveAreaLayout() {
    try {
      setLoading(true);
      await apiSaveFloorplan({ layoutJson: layout });
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
      setEditMode(false);
    }
  }

  const activeList = tab === "Binnen" ? byArea.Binnen : tab === "Buiten" ? byArea.Buiten : byArea.Webshop;

  return (
    <div className="page" style={{ padding: 16 }}>
      <h1>Gebieden</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className={`btn ${tab === "Binnen" ? "primary" : ""}`} onClick={() => setTab("Binnen")}>Binnen</button>
        <button className={`btn ${tab === "Buiten" ? "primary" : ""}`} onClick={() => setTab("Buiten")}>Buiten</button>
        <button className={`btn ${tab === "Webshop" ? "primary" : ""}`} onClick={() => setTab("Webshop")}>Webshop</button>
      </div>

      {loading && <p>Data laden…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {tab === "Webshop" ? (
        <div style={{ color: "#374151" }}>Webshop gebied heeft geen tafels. Gebruik Bestellingen voor online orders.</div>
      ) : (
        <div style={{ position: "relative", minHeight: 520, border: "1px dashed #ddd", borderRadius: 12 }}>
          {(tab === "Binnen" ? blocksForArea("Binnen") : blocksForArea("Buiten")).map((b) => {
            const t = activeList.find((x) => x.id === b.id);
            if (!t) return null;
            const color = t.status === "ACTIVE" ? "#10b981" : t.status === "BUSY" ? "#f59e0b" : "#e5e7eb";
            return (
              <div key={t.id}
                onMouseDown={(e) => {
                  if (!editMode) return;
                  const canvas = (e.currentTarget.parentElement as HTMLDivElement);
                  const rect = canvas.getBoundingClientRect();
                  const offX = (e.clientX - rect.left) - (b.x || 0);
                  const offY = (e.clientY - rect.top) - (b.y || 0);
                  const move = (ev: MouseEvent) => {
                    const nx = Math.max(0, Math.round((ev.clientX - rect.left) - offX));
                    const ny = Math.max(0, Math.round((ev.clientY - rect.top) - offY));
                    setBlockPosition(t.id, nx, ny);
                  };
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                }}
                style={{ position: "absolute", left: b.x || 0, top: b.y || 0, width: b.w || 110, height: b.h || 84, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", padding: 8, cursor: editMode ? "move" : "pointer", userSelect: "none" }}
                onClick={() => { if (!editMode) handleClickTable(t); }}
              >
                <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                  <div style={{ fontWeight: 800 }}>{t.name}</div>
                  <div style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: color, color: t.status === "FREE" ? "#111827" : "white" }}>{t.status === "FREE" ? "Vrij" : t.status === "BUSY" ? "Bezet" : "Actief"}</div>
                  {editMode && (
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <label style={{ fontSize: 11, color: "#6b7280" }}>Gebied</label>
                      <select
                        value={(t.area || "Binnen").trim().length ? (t.area as string) : "Binnen"}
                        onChange={async (e) => {
                          const newArea = e.target.value as "Binnen" | "Buiten" | "Webshop";
                          try {
                            setAreaSavingId(t.id);
                            await apiUpdateTable(t.id, { area: newArea });
                            setTables((prev) => prev.map((row) => row.id === t.id ? { ...row, area: newArea } : row));
                          } catch (err) {
                            // best-effort; keep UI responsive
                          } finally {
                            setAreaSavingId(null);
                          }
                        }}
                        disabled={areaSavingId === t.id}
                        style={{ fontSize: 12 }}
                      >
                        <option value="Binnen">Binnen</option>
                        <option value="Buiten">Buiten</option>
                        <option value="Webshop">Webshop</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {tab !== "Webshop" && (
          <>
            <button className="btn" onClick={() => setEditMode((v) => !v)}>{editMode ? "Stop beheer" : "Beheer gebied"}</button>
            {editMode && <button className="btn" onClick={saveAreaLayout}>Opslaan</button>}
          </>
        )}
      </div>
    </div>
  );
}
