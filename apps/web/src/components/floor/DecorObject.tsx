import React from "react";
import type { FloorObject } from "../../lib/floor/types";

type Props = {
  obj: FloorObject;
  scale: number;
  mode: "USE" | "EDIT";
};

export default function DecorObject({ obj, scale }: Props) {
  const s = obj.subtype || "TEXT";
  const style: React.CSSProperties = {
    position: "absolute",
    left: obj.x * scale,
    top: obj.y * scale,
    width: obj.w * scale,
    height: obj.h * scale,
    background: "#f3f4f6",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#374151",
    fontWeight: 700,
  };
  if (s === "PLANT") {
    style.borderRadius = Math.max(obj.w, obj.h) * scale;
    style.width = style.height; // circle
    return <div style={style}>🌿</div>;
  }
  if (s === "BAR") {
    style.background = "#e5e7eb";
    return <div style={style}>Bar</div>;
  }
  if (s === "TEXT") {
    return <div style={{ position: "absolute", left: obj.x * scale, top: obj.y * scale, color: "#374151" }}>{obj.label || ""}</div>;
  }
  return <div style={style}>{obj.label || s}</div>;
}
