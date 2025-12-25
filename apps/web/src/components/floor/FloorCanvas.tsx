import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FloorObject, ZoneSettings } from "../../lib/floor/types";
import FloorObjectRenderer from "./FloorObjectRenderer";
import { Rnd } from "react-rnd";
import type { TableDTO } from "../../api/pos/tables";

type Props = {
  mode: "USE" | "EDIT";
  zoneSettings: ZoneSettings;
  objects: FloorObject[];
  onObjectsChange: (objs: FloorObject[]) => void;
  tables: TableDTO[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
};

export default function FloorCanvas({ mode, zoneSettings, objects, onObjectsChange, tables, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1024, h: 768 });
  const baseW = zoneSettings.baseWidth || 1024;
  const baseH = zoneSettings.baseHeight || 768;
  const scale = useMemo(() => Math.min(size.w / baseW, size.h / baseH), [size.w, size.h, baseW, baseH]);
  const tableById = useMemo(() => new Map<string, TableDTO>(tables.map((t) => [t.id, t])), [tables]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.contentRect) setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    const el = containerRef.current;
    if (el) obs.observe(el);
    return () => { if (el) obs.unobserve(el); };
  }, []);

  function updateObj(id: string, patch: Partial<FloorObject>) {
    onObjectsChange(objects.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  const gridSize = 16;
  const bg = zoneSettings.backgroundTint || "#f9fafb";

  return (
    <div ref={containerRef} style={{ position: "relative", minHeight: 480, height: "60vh", background: bg, borderRadius: 12, border: "1px solid #e5e7eb" }}>
      {zoneSettings.gridEnabled && mode === "EDIT" && (
        <GridOverlay spacing={gridSize} />
      )}
      {objects.map((obj) => {
        if (mode === "USE") {
          return (
            <FloorObjectRenderer key={obj.id} obj={obj} scale={scale} mode={mode} zoneSettings={zoneSettings} tableById={tableById} />
          );
        }
        // EDIT mode: RND wrappers
        return (
          <Rnd
            key={obj.id}
            size={{ width: obj.w * scale, height: obj.h * scale }}
            position={{ x: obj.x * scale, y: obj.y * scale }}
            bounds="parent"
            enableResizing={{ top:true, right:true, bottom:true, left:true, topRight:true, bottomRight:true, bottomLeft:true, topLeft:true }}
            dragGrid={zoneSettings.snapEnabled ? [gridSize, gridSize] : [1,1]}
            resizeGrid={zoneSettings.snapEnabled ? [gridSize, gridSize] : [1,1]}
            onDragStop={(e, d) => {
              updateObj(obj.id, { x: Math.round(d.x / scale), y: Math.round(d.y / scale) });
            }}
            onResizeStop={(e, dir, ref, delta, pos) => {
              updateObj(obj.id, { x: Math.round(pos.x / scale), y: Math.round(pos.y / scale), w: Math.round(ref.offsetWidth / scale), h: Math.round(ref.offsetHeight / scale) });
            }}
          >
            <div style={{ width: "100%", height: "100%", outline: selectedId === obj.id ? "2px dashed #60a5fa" : "none" }} onMouseDown={() => onSelect?.(obj.id)}>
              <FloorObjectRenderer obj={obj} scale={scale} mode={mode} zoneSettings={zoneSettings} tableById={tableById} />
              {selectedId === obj.id && (
                <InlineTools
                  x={obj.x * scale}
                  y={obj.y * scale}
                  w={obj.w * scale}
                  h={obj.h * scale}
                  obj={obj}
                  tables={tables}
                  onAssign={(tableId) => {
                    const t = tableId ? tableById.get(tableId) : undefined;
                    updateObj(obj.id, { tableId: tableId || null, label: t?.name || obj.label });
                  }}
                  onDelete={() => {
                    onObjectsChange(objects.filter((o) => o.id !== obj.id));
                    onSelect?.(null);
                  }}
                />
              )}
            </div>
          </Rnd>
        );
      })}
    </div>
  );
}

function GridOverlay({ spacing }: { spacing: number }) {
  const bgSize = `${spacing}px ${spacing}px`;
  return (
    <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`, backgroundSize: bgSize, pointerEvents: "none", borderRadius: 12 }} />
  );
}

function InlineTools({ x, y, w, h, obj, tables, onAssign, onDelete }: { x: number; y: number; w: number; h: number; obj: FloorObject; tables: TableDTO[]; onAssign: (id: string | null) => void; onDelete: () => void }) {
  const left = x + w + 6;
  const top = y - 6;
  return (
    <div style={{ position: "absolute", left, top, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 6, display: "flex", gap: 6, alignItems: "center" }}>
      {obj.kind === "TABLE" && (
        <>
          <select value={obj.tableId || ""} onChange={(e) => onAssign(e.target.value || null)}>
            <option value="">— koppel tafel —</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button className="btn" onClick={() => onAssign(obj.tableId || null)}>Koppelen</button>
        </>
      )}
      <button className="btn danger" onClick={onDelete}>🗑</button>
    </div>
  );
}
