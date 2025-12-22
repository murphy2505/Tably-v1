import { useUi } from "../../stores/uiStore";
import type { OrderDTO } from "../../api/pos/orders";

const TABS = ["Overzicht", "Historie", "Wallets", "Punten"] as const;

type Props = {
  activeOrderCustomer: OrderDTO["customer"] | undefined | null;
};

export default function CustomerCardOverlay({ activeOrderCustomer }: Props) {
  const { customerCardOpen, customerCardCustomerId, closeCustomerCard } = useUi();
  const open = customerCardOpen;

  if (!open) return null;

  const matchesActive = customerCardCustomerId && activeOrderCustomer?.id === customerCardCustomerId;
  const customer = matchesActive ? activeOrderCustomer : null;

  return (
    <div className="cust-overlay" role="dialog" aria-modal>
      <div className="cust-overlay-topbar">
        <button className="btn" onClick={closeCustomerCard}>Annuleren</button>
        <div className="cust-overlay-title">
          <div className="cust-name">{customer?.name || customer?.phoneE164 || "Klant"}</div>
          {customer?.phoneE164 && <div className="cust-sub">{customer.phoneE164}</div>}
        </div>
        <div className="cust-overlay-actions" />
      </div>

      <div className="cust-tabs">
        {TABS.map((t) => (
          <button key={t} className={`cust-tab ${t === "Overzicht" ? "active" : ""}`}>{t}</button>
        ))}
      </div>

      <div className="cust-body">
        <div className="cust-section">
          <div className="cust-section-title">Overzicht</div>
          <div className="cust-section-content">Placeholder: klantoverzicht komt hier.</div>
        </div>
        <div className="cust-section">
          <div className="cust-section-title">Historie</div>
          <div className="cust-section-content">Placeholder: bestelgeschiedenis.</div>
        </div>
        <div className="cust-section">
          <div className="cust-section-title">Wallets</div>
          <div className="cust-section-content">Placeholder: wallets/passen.</div>
        </div>
        <div className="cust-section">
          <div className="cust-section-title">Punten</div>
          <div className="cust-section-content">Placeholder: punten-overzicht.</div>
        </div>
      </div>
    </div>
  );
}
