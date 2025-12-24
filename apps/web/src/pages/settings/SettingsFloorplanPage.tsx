import { useEffect, useMemo, useRef, useState } from "react";
import { apiCreateTable, apiGetFloorplan, apiListTables, apiSaveFloorplan, apiUpdateTable, type TableDTO } from "../../api/pos/tables";

export default function SettingsFloorplanPage() {
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [fp, tl] = await Promise.all([apiGetFloorplan(), apiListTables()]);
        if (!cancelled) {
          setTables(tl.tables || []);
          const l = Array.isArray(fp.floorplan?.layoutJson) ? fp.floorplan.layoutJson : [];
          setLayout(l);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Kon plattegrond niet laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const layoutById = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of layout || []) if (b?.id) m.set(String(b.id), b);
    return m;
  }, [layout]);

  function ensureBlock(tableId: string) {
    const existing = layoutById.get(tableId);
    if (existing) return existing;
    const block = { id: tableId, x: 16, y: 16, w: 110, h: 84 };
    setLayout((prev) => [...prev, block]);
    return block;
  }

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  function onMouseDown(e: React.MouseEvent, id: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const block = ensureBlock(id);
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    dragRef.current = { id, offX: mouseX - (block.x || 0), offY: mouseY - (block.y || 0) };
  }

  function onMouseMove(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drag = dragRef.current;
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const nx = Math.max(0, Math.round(mouseX - drag.offX));
    const ny = Math.max(0, Math.round(mouseY - drag.offY));
    setLayout((prev) => prev.map((b) => (b.id === drag.id ? { ...b, x: nx, y: ny } : b)));
  }

  function onMouseUp() {
    dragRef.current = null;
  }

  async function save() {
    try {
      setSaving(true);
      await apiSaveFloorplan({ layoutJson: layout });
    } finally {
      setSaving(false);
    }
  }

  async function updateName(id: string, name: string) {
    try {
      await apiUpdateTable(id, { name });
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
    } catch {}
  }

  async function addTable() {
    const name = newName.trim();
    const capacity = Number(newCapacity) || undefined;
    if (!name) return;
    try {
      const res = await apiCreateTable({ name, capacity });
      const created = res.table as TableDTO;
      setTables((prev) => [...prev, created]);
      // add default block
      setLayout((prev) => [...prev, { id: created.id, x: 16, y: 16, w: 110, h: 84 }]);
      setNewName("");
      setNewCapacity("");
    } catch {}
  }

  return (
    <div className="page" style={{ padding: 16 }}>
      <h1>Plattegrond</h1>
      {loading && <p>Plattegrond laden…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16 }}>
        <div
          ref={canvasRef}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ position: "relative", minHeight: 520, border: "1px dashed #ddd", borderRadius: 12 }}
        >
          {tables.map((t) => {
            const b = layoutById.get(t.id) || { x: 16, y: 16, w: 110, h: 84 };
            return (
              <div key={t.id}
                onMouseDown={(e) => onMouseDown(e, t.id)}
                style={{ position: "absolute", left: b.x || 0, top: b.y || 0, width: b.w || 110, height: b.h || 84, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", padding: 8, cursor: "move", userSelect: "none" }}
              >
                <div style={{ fontWeight: 800 }}>{t.name}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ fontWeight: 700 }}>Tafels</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="orders-search" placeholder="Naam (bijv. T1)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="orders-search" placeholder="Capaciteit" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
            <button className="btn" onClick={addTable}>Toevoegen</button>
          </div>
          {tables.map((t) => (
            <div key={t.id} style={{ display: "grid", gap: 6 }}>
              <input className="orders-search" value={t.name} onChange={(e) => updateName(t.id, e.target.value)} />
            </div>
          ))}
          <button className="btn" disabled={saving} onClick={save}>{saving ? "Opslaan…" : "Opslaan"}</button>
        </div>
      </div>
    </div>
  );
}
