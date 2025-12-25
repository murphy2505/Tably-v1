import React, { useEffect, useMemo, useState } from "react";
import ZoneTabs from "../../components/floor/ZoneTabs";
import ZoneSettingsSheet from "../../components/floor/ZoneSettingsSheet";
import FloorCanvas from "../../components/floor/FloorCanvas";
import type { Zone, FloorObject, ZoneSettings } from "../../lib/floor/types";
import { loadZoneSettings, saveZoneSettings, loadZoneObjects, saveZoneObjects } from "../../lib/floor/storage";
import { apiListTables, type TableDTO } from "../../api/pos/tables";

const DEFAULT_ZONES: Zone[] = [
  { id: "binnen", name: "Binnen", sortOrder: 1 },
  { id: "terras", name: "Terras", sortOrder: 2 },
  { id: "afhaal", name: "Afhaal", sortOrder: 3 },
];

export default function FloorplanPage() {
  const [zones] = useState<Zone[]>(DEFAULT_ZONES);
  const [zoneId, setZoneId] = useState<string>(DEFAULT_ZONES[0].id);
  const [mode, setMode] = useState<"USE" | "EDIT">("USE");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ZoneSettings>(() => loadZoneSettings(DEFAULT_ZONES[0].id));
  const [objects, setObjects] = useState<FloorObject[]>(() => loadZoneObjects(DEFAULT_ZONES[0].id));
  const [tables, setTables] = useState<TableDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentZone = useMemo(() => zones.find((z) => z.id === zoneId)!, [zones, zoneId]);

  useEffect(() => {
    setSettings(loadZoneSettings(zoneId));
    setObjects(loadZoneObjects(zoneId));
    refreshTables();
  }, [zoneId]);

  async function refreshTables() {
    try {
      const res = await apiListTables();
      const list = (res.tables || []).filter((t) => (t.area || "").toLowerCase() === currentZone.name.toLowerCase());
      setTables(list);
    } catch {
      setTables([]);
    }
  }

  function addObject() {
    if (mode !== "EDIT") return;
    const id = `obj_${Date.now()}`;
    const shape = settings.defaultTableShape || "RECT";
    const newObj: FloorObject = { id, zoneId, kind: "TABLE", label: `T${(objects.length + 1)}`, x: 40, y: 40, w: shape === "ROUND" ? 120 : 160, h: 120, tableId: null, meta: { shape } };
    setObjects([...objects, newObj]);
  }

  function removeSelected() {
    if (mode !== "EDIT") return;
    if (!selectedId) return;
    setObjects(objects.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  function save() {
    saveZoneSettings(zoneId, settings);
    saveZoneObjects(zoneId, objects);
    alert("Plattegrond opgeslagen (lokaal)");
  }

  return (
    <div className="page" style={{ padding: 16, background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Gebieden – Tafels</h1>
          <ZoneTabs
            zones={zones}
            currentZoneId={zoneId}
            onSelect={(zid) => setZoneId(zid)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setMode(mode === "USE" ? "EDIT" : "USE")}>{mode === "USE" ? "Bewerk" : "Gebruik"}</button>
          {mode === "EDIT" && (
            <>
              <button className="btn" onClick={addObject}>+</button>
              <button className="btn" onClick={removeSelected}>Verwijderen (laatste)</button>
              <button className="btn primary" onClick={save}>Opslaan</button>
            </>
          )}
        </div>
      </div>

      {/* Canvas card */}
      <FloorCanvas
        mode={mode}
        zoneSettings={settings}
        objects={objects}
        onObjectsChange={setObjects}
        tables={tables}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Settings */}
      <ZoneSettingsSheet open={settingsOpen} initial={settings} onClose={() => setSettingsOpen(false)} onSave={(s) => { setSettings(s); setSettingsOpen(false); }} />
    </div>
  );
}
