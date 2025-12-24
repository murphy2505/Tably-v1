import React from "react";
import type { Product } from "../../api/pos/products";

type Props = {
  product: Product;
  onOpen: (p: Product) => void;
};

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function ProductCard({ product, onOpen }: Props) {
  const status = product.isActive ? "Actief" : "Inactief";
  const badges: string[] = [];
  if (product.category?.name) badges.push(product.category.name);
  // mock badges
  if (product.productGroup?.name) badges.push("Populair");
  return (
    <button
      className="order-row"
      onClick={() => onOpen(product)}
      style={{
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        display: "grid",
        gap: 6,
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 800 }}>{product.name}</div>
        <div style={{ color: "#374151" }}>{formatEuro(product.basePriceCents)}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: product.isActive ? "#10b981" : "#9ca3af", color: "white" }}>{status}</span>
        {badges.map((b, i) => (
          <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}>{b}</span>
        ))}
      </div>
    </button>
  );
}
