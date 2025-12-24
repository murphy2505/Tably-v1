import React from "react";

type Props = {
  title: string;
  value: string | number;
  hint?: string;
};

export default function StatCard({ title, value, hint }: Props) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      padding: 16,
      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
      display: "grid",
      gap: 6,
      minWidth: 180,
    }}>
      <div style={{ color: "#6b7280", fontSize: 12 }}>{title}</div>
      <div style={{ fontWeight: 900, fontSize: 20, color: "#111827" }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: "#10b981" }}>{hint}</div>}
    </div>
  );
}
