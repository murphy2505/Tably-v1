import React, { useEffect, useState } from "react";
import type { ZoneSettings } from "../../lib/floor/types";

type Props = {
  open: boolean;
  initial: ZoneSettings;
  onClose: () => void;
  onSave: (settings: ZoneSettings) => void;
};

export default function ZoneSettingsSheet({ open, initial, onClose, onSave }: Props) {
  const [settings, setSettings] = useState<ZoneSettings>(initial);
  useEffect(() => { setSettings(initial); }, [initial, open]);

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.12)", display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: 360, background: "#fff", borderLeft: "1px solid #e5e7eb", padding: 12, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>Zone-instellingen</div>
        <label>
          <div>Zone achtergrondtint</div>
          <input type="color" value={settings.backgroundTint || "#f9fafb"} onChange={(e) => setSettings({ ...settings, backgroundTint: e.target.value })} />
        </label>
        <label>
          <input type="checkbox" checked={!!settings.gridEnabled} onChange={(e) => setSettings({ ...settings, gridEnabled: e.target.checked })} /> Raster tonen (bewerken)
        </label>
        <label>
          <input type="checkbox" checked={!!settings.snapEnabled} onChange={(e) => setSettings({ ...settings, snapEnabled: e.target.checked })} /> Snap-to-grid
        </label>
        <label>
          <input type="checkbox" checked={!!settings.showAmountsOnTables} onChange={(e) => setSettings({ ...settings, showAmountsOnTables: e.target.checked })} /> Toon bedragen op tafels
        </label>
        <label>
          <input type="checkbox" checked={!!settings.showNamesOnTables} onChange={(e) => setSettings({ ...settings, showNamesOnTables: e.target.checked })} /> Toon klantnaam op tafels
        </label>
        <label>
          <div>Standaard tafelvorm</div>
          <select value={settings.defaultTableShape || "RECT"} onChange={(e) => setSettings({ ...settings, defaultTableShape: e.target.value as any })}>
            <option value="RECT">Rechthoek</option>
            <option value="ROUND">Rond</option>
          </select>
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={onClose}>Sluiten</button>
          <button className="btn primary" onClick={() => onSave(settings)}>Opslaan</button>
        </div>
      </div>
    </div>
  );
}
