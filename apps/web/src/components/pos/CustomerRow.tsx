import type { OrderDTO } from "../../api/pos/orders";
import { useUi } from "../../stores/uiStore";

type Props = {
  customer: OrderDTO["customer"] | undefined | null;
};

export default function CustomerRow({ customer }: Props) {
  const { openCustomerPanel } = useUi();

  const title = customer?.name || customer?.phoneE164 || "Klant toevoegen";
  const sub = customer
    ? (customer.phoneE164 ? `Tel: ${customer.phoneE164}` : "Tik voor klantenkaart")
    : "Zoek op naam of telefoon";

  return (
    <div
      className="customer-row"
      role="button"
      aria-label="Klant"
      onClick={() => {
        console.log("[CustomerRow] click, hasCustomer:", !!customer?.id);
        if (customer?.id) openCustomerPanel("CARD", customer.id);
        else openCustomerPanel("SELECT", null);
      }}
    >
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#374151" }}>{sub}</div>
      </div>
      {customer?.loyalty && (
        <div style={{ fontSize: 12, color: "#065f46", fontWeight: 700 }}>Punten: {customer.loyalty.points}</div>
      )}
    </div>
  );
}
