import React from "react";
import type { Zone } from "../../lib/floor/types";

type Props = {
  zones: Zone[];
  currentZoneId: string;
  onSelect: (zoneId: string) => void;
  onOpenSettings: (zoneId: string) => void;
};

export default function ZoneTabs({ zones, currentZoneId, onSelect, onOpenSettings }: Props) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {zones.map((z) => (
        <button
          key={z.id}
          onClick={() => onSelect(z.id)}
          style={{
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: currentZoneId === z.id ? "#d1fae5" : "#fff",
            color: currentZoneId === z.id ? "#065f46" : "#374151",
            padding: "6px 12px",
          }}
        >
          {z.name}
        </button>
      ))}
      {/* gear for current zone */}
      <button className="btn" onClick={() => onOpenSettings(currentZoneId)} title="Zone-instellingen" aria-label="Zone-instellingen">⚙️</button>
    </div>
  );
}
