import React from "react";
import type { CategoryDTO } from "../../api/pos/categories";

type Props = {
  category: CategoryDTO & { productsCount?: number };
};

export default function CategoryCard({ category }: Props) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      padding: 12,
      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
      display: "grid",
      gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 800 }}>{category.name}</div>
        <div style={{ color: "#374151" }}>{category.productsCount ?? 0} producten</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <label style={{ fontSize: 12, color: "#6b7280" }}>
          <input type="checkbox" checked={category.isActive} readOnly /> POS
        </label>
        <label style={{ fontSize: 12, color: "#6b7280" }}>
          <input type="checkbox" checked={true} readOnly /> Webshop
        </label>
      </div>
    </div>
  );
}
