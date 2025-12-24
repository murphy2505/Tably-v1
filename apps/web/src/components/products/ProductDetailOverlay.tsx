import React, { useState } from "react";
import type { Product } from "../../api/pos/products";

type Props = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
};

export default function ProductDetailOverlay({ product, open, onClose }: Props) {
  const [tab, setTab] = useState<"overzicht" | "varianten" | "voorraad" | "pos" | "webshop">("overzicht");
  if (!open) return null;

  return (
    <div className="checkout-modal-overlay" onClick={() => onClose()}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 0, width: 920, maxWidth: "90vw" }}>
        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
          <div style={{ fontWeight: 900 }}>{product?.name || "Product"}</div>
          <button className="btn" onClick={onClose}>Terug</button>
        </div>

        {/* Tabs */}
        <div style={{ padding: 12, display: "flex", gap: 8 }}>
          <button className={`btn ${tab === "overzicht" ? "primary" : ""}`} onClick={() => setTab("overzicht")}>Overzicht</button>
          <button className={`btn ${tab === "varianten" ? "primary" : ""}`} onClick={() => setTab("varianten")}>Varianten / Porties</button>
          <button className={`btn ${tab === "voorraad" ? "primary" : ""}`} onClick={() => setTab("voorraad")}>Voorraad / Recept</button>
          <button className={`btn ${tab === "pos" ? "primary" : ""}`} onClick={() => setTab("pos")}>POS instellingen</button>
          <button className={`btn ${tab === "webshop" ? "primary" : ""}`} onClick={() => setTab("webshop")}>Webshop instellingen</button>
        </div>

        {/* Content */}
        <div style={{ padding: 12 }}>
          {tab === "overzicht" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Prijs</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format((product?.basePriceCents ?? 0) / 100)}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Status</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{product?.isActive ? "Actief" : "Inactief"}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Categorie</div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{product?.category?.name ?? "—"}</div>
                </div>
              </div>
            </div>
          )}

          {tab === "varianten" && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#6b7280", marginBottom: 8 }}>Varianten / Porties (mock)</div>
              <div style={{ fontSize: 12, color: "#374151" }}>Nog geen data</div>
            </div>
          )}

          {tab === "voorraad" && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#6b7280", marginBottom: 8 }}>Voorraad / Recept (mock)</div>
              <div style={{ fontSize: 12, color: "#374151" }}>Nog geen data</div>
            </div>
          )}

          {tab === "pos" && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#6b7280", marginBottom: 8 }}>POS instellingen (mock)</div>
              <div style={{ fontSize: 12, color: "#374151" }}>Nog geen data</div>
            </div>
          )}

          {tab === "webshop" && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#6b7280", marginBottom: 8 }}>Webshop instellingen (mock)</div>
              <div style={{ fontSize: 12, color: "#374151" }}>Nog geen data</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
