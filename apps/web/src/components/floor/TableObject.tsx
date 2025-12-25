import React, { useMemo } from "react";
import type { FloorObject, ZoneSettings } from "../../lib/floor/types";
import type { TableDTO } from "../../api/pos/tables";
import { useLocation, useNavigate } from "react-router-dom";
import { apiOpenOrAssignOrderToTable } from "../../api/pos/tables";

type Props = {
  obj: FloorObject;
  scale: number;
  mode: "USE" | "EDIT";
  zoneSettings: ZoneSettings;
  tableInfo?: TableDTO | null;
};

export default function TableObject({ obj, scale, mode, zoneSettings, tableInfo }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const shape = (obj.meta?.shape || zoneSettings.defaultTableShape || "RECT");
  const label = obj.label || (tableInfo?.name ? tableInfo.name : obj.tableId || "Tafel");

  const statusStyle = useMemo(() => {
    const s = (tableInfo?.status || "FREE").toUpperCase();
    if (s === "FREE") return { bg: "#f3f4f6", border: "#e5e7eb" };
    if (s === "BUSY") return { bg: "#d1fae5", border: "#10b981" };
    if (s === "ACTIVE") return { bg: "#bfdbfe", border: "#60a5fa" };
    return { bg: "#f3f4f6", border: "#e5e7eb" };
  }, [tableInfo]);

  const style: React.CSSProperties = {
    position: "absolute",
    left: obj.x * scale,
    top: obj.y * scale,
    width: obj.w * scale,
    height: obj.h * scale,
    background: statusStyle.bg,
    borderRadius: shape === "ROUND" ? Math.max(obj.w, obj.h) * scale : 12,
    border: `2px solid ${statusStyle.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#111827",
    fontWeight: 900,
    userSelect: "none",
  };

  const subline = useMemo(() => {
    if (zoneSettings.showNamesOnTables && tableInfo?.openOrderId) {
      return ""; // placeholder; needs order-customer through extra fetch; skip for now
    }
    if (zoneSettings.showAmountsOnTables && tableInfo?.openOrderId) {
      return ""; // totals require API call; skip to keep UI clean
    }
    return "";
  }, [zoneSettings, tableInfo]);

  async function onTap() {
    if (mode !== "USE") return;
    const params = new URLSearchParams(location.search);
    const pickForOrder = params.get("pickForOrder");
    const returnTo = params.get("returnTo") || "/pos";
    if (pickForOrder) {
      if (obj.tableId) {
        navigate(`${returnTo}?pickForOrder=${encodeURIComponent(pickForOrder)}&pickedTableId=${encodeURIComponent(obj.tableId)}`, { replace: true });
      }
      return;
    }
    if (obj.tableId) {
      if (tableInfo?.openOrderId) {
        navigate(`/orders/${tableInfo.openOrderId}`);
      } else {
        try {
          const res = await apiOpenOrAssignOrderToTable(obj.tableId);
          const orderId = (res as any)?.order?.id || res?.order?.id;
          if (orderId) navigate(`/orders/${orderId}`);
        } catch {}
      }
    }
  }

  return (
    <div style={style} onClick={onTap} title={subline ? subline : label}>
      <div style={{ textAlign: "center" }}>
        <div>{label}</div>
        {subline && <div style={{ fontSize: 12, color: "#374151" }}>{subline}</div>}
      </div>
    </div>
  );
}
