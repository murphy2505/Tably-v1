import type { OrderDTO } from "../../api/pos/orders";

type Props = {
  customer: OrderDTO["customer"] | undefined | null;
  onOpen: () => void;
  onUnlink: () => void;
};

export default function CustomerBanner({ customer, onOpen, onUnlink }: Props) {
  if (!customer) return null;
  const title = customer.name || customer.phoneE164 || `Klant #${customer.id.slice(-6)}`;
  const points = customer.loyalty?.points ?? null;

  return (
    <div
      className="customer-banner"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "8px 10px",
        cursor: "pointer",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>Klant</div>
        <div style={{ color: "#374151" }}>{title}</div>
        {points != null && (
          <div style={{ marginLeft: 6, fontSize: 12, color: "#6b7280" }}>Punten: {points}</div>
        )}
      </div>
      <button
        className="btn"
        onClick={(e) => {
          e.stopPropagation();
          onUnlink();
        }}
      >
        Loskoppelen
      </button>
    </div>
  );
}
