import type { OrderDTO } from "../../api/pos/orders";

type Props = {
  customer: OrderDTO["customer"] | undefined | null;
  onOpen: () => void;
  onUnlink: () => void;
};

export default function CustomerBox({ customer, onOpen, onUnlink }: Props) {
  const title = customer?.name || customer?.phoneE164 || (customer ? `Klant #${customer.id.slice(-6)}` : "+ Klant koppelen");
  const points = customer?.loyalty?.points ?? null;
  const sub = customer ? "Tik voor klantkaart" : "Tik om te zoeken / nieuw";

  return (
    <div
      className="customer-box"
      onClick={onOpen}
      role="button"
      aria-label="Klant"
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        <div style={{ fontWeight: 800, whiteSpace: "nowrap" }}>Klant</div>
        <div style={{ color: "#111827", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {points != null && (
          <div style={{ marginLeft: 6, fontSize: 12, color: "#065f46" }}>Punten: {points}</div>
        )}
        <div style={{ marginLeft: 6, fontSize: 12, color: "#374151" }}>{sub}</div>
      </div>
      {customer && (
        <button
          className="bon-link"
          onClick={(e) => {
            e.stopPropagation();
            onUnlink();
          }}
        >
          Los
        </button>
      )}
    </div>
  );
}
