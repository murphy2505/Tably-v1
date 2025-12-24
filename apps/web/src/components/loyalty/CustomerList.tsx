import React from "react";
import type { CustomerDTO } from "../../api/loyalty";

type Props = {
  customers: Array<CustomerDTO & { lastVisit?: string | null }>;
  onSelect: (cust: CustomerDTO) => void;
};

export default function CustomerList({ customers, onSelect }: Props) {
  const top = customers.slice(0, 5);
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      padding: 12,
      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
      display: "grid",
      gap: 8,
    }}>
      {top.map((c) => (
        <button
          key={c.id}
          className="order-row"
          onClick={() => onSelect(c)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
        >
          <div>
            <div className="order-row-title">{c.name || c.phoneE164 || c.email || `Klant #${c.id.slice(-6)}`}</div>
            <div className="order-row-meta" style={{ display: "flex", gap: 12 }}>
              {c.phoneE164 && <span>{c.phoneE164}</span>}
              {c.email && <span>{c.email}</span>}
              {c.loyalty && <span>Punten: {c.loyalty.points}</span>}
              {c.lastVisit && <span>Laatste bezoek: {c.lastVisit}</span>}
            </div>
          </div>
        </button>
      ))}
      {top.length === 0 && (
        <div style={{ color: "#6b7280" }}>Nog geen recente klanten</div>
      )}
    </div>
  );
}
