import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useOrders } from "../stores/ordersStore";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

type PayMethod = "PIN" | "CASH" | "GIFTCARD";
type CheckoutView = "CHECKOUT_IDLE" | "CASH_HELP" | "GIFT_FLOW" | "CHECKOUT_COMPLETE";

export type CheckoutStateV1 = { lines: { title: string; qty: number; priceCents: number; lineTotalCents: number }[]; totalCents: number };
export type CheckoutState = { orderId: string } | CheckoutStateV1;

export default function CheckoutScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const nav = (state || {}) as Partial<CheckoutState>;
  const { orders, getTotalCents, getItemsCount, duplicateToNewOpen, markPaid } = useOrders();

  let orderId: string | undefined = undefined;
  if (nav && (nav as any).orderId) orderId = (nav as any).orderId as string;

  const order = orders.find((o) => o.id === orderId);
  const lines = order ? order.lines : [];
  const totalCents = orderId ? getTotalCents(orderId) : 0;

  const [view, setView] = useState<CheckoutView>("CHECKOUT_IDLE");
  const [method, setMethod] = useState<PayMethod | null>(null);

  // CASH: store string digits, treat as euros
  const [receivedStr, setReceivedStr] = useState<string>("");
  const receivedCents = useMemo(() => (parseInt(receivedStr || "0", 10) * 100) | 0, [receivedStr]);
  const changeCents = Math.max(0, receivedCents - totalCents);

  // GIFTCARD placeholders
  const [giftCode, setGiftCode] = useState<string>("");

  const subtotalCents = useMemo(() => lines.reduce((s, l) => s + l.qty * l.priceCents, 0), [lines]);
  const vatLowCents = 0;
  const vatHighCents = 0;

  function selectMethod(next: PayMethod) {
    setMethod(next);
    if (next === "CASH") setView("CASH_HELP");
    else if (next === "PIN") setView("CHECKOUT_IDLE");
    else setView("GIFT_FLOW");
  }

  function onConfirm() {
    if (method === "PIN") {
      setView("CHECKOUT_COMPLETE");
      return;
    }
    if (method === "CASH") {
      if (receivedCents >= totalCents) setView("CHECKOUT_COMPLETE");
      return;
    }
    if (method === "GIFTCARD") {
      setView("CHECKOUT_COMPLETE");
      return;
    }
  }

  function onAbort() {
    navigate("/pos");
  }
  function onDone() {
    if (orderId) {
      markPaid(orderId);
    }
    navigate("/pos");
  }

  // Missing state case
  if (!orderId || !order) {
    return (
      <div className="checkout-screen light" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Geen huidige bestelling</div>
          <div style={{ color: "#6b7280" }}>Vernieuwde pagina of directe toegang.</div>
          <button className="btn primary" onClick={() => navigate("/pos")}>Terug naar POS</button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-screen light">
      {/* No floating trigger; placed in bottom bar */}

      <div className="checkout-grid">
        {/* LEFT column */}
        <section className="checkout-left">
          <div className="receipt-panel">
            <div className="receipt-header">
              <div className="receipt-title">Bon</div>
              <div className="receipt-total">
                <div className="receipt-total-label">Totaal</div>
                <div className="receipt-total-value">{formatEuro(totalCents)}</div>
              </div>
            </div>

            <div className="receipt-body">
              {lines.length === 0 ? (
                <div style={{ opacity: 0.6 }}>Geen items</div>
              ) : (
                lines.map((l, idx) => (
                  <div key={`${l.title}-${idx}`} className="receipt-line">
                    <div className="receipt-line-title">{l.title}</div>
                    <div className="receipt-line-meta">
                      <span className="qty">{l.qty}×</span>
                      <span className="line-total">{formatEuro(l.qty * l.priceCents)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="receipt-footer-sticky">
              <div className="sum-row"><span>Subtotaal</span><span>{formatEuro(subtotalCents)}</span></div>
              <div className="sum-row"><span>BTW laag</span><span>{vatLowCents ? formatEuro(vatLowCents) : "—"}</span></div>
              <div className="sum-row"><span>BTW hoog</span><span>{vatHighCents ? formatEuro(vatHighCents) : "—"}</span></div>
              <div className="sum-row sum-total"><span>Totaal</span><span>{formatEuro(totalCents)}</span></div>
            </div>
          </div>
        </section>

        {/* RIGHT column */}
        <section className="checkout-right">
          <div className="pay-tiles">
            <button className={`pay-tile ${method === "CASH" ? "active" : ""}`} onClick={() => selectMethod("CASH")}>Contant</button>
            <button className={`pay-tile ${method === "PIN" ? "active" : ""}`} onClick={() => selectMethod("PIN")}>Pin</button>
            <button className={`pay-tile ${method === "GIFTCARD" ? "active" : ""}`} onClick={() => selectMethod("GIFTCARD")}>Kadobon</button>
          </div>

          <div className="pay-context">
            {view === "CHECKOUT_IDLE" && (
              <div className="pay-note">Kies een betaalmethode om verder te gaan.</div>
            )}

            {view === "CASH_HELP" && (
              <div className="cash-grid">
                <div className="cash-row">
                  <span>Ontvangen</span>
                  <span className="cash-display">{formatEuro(receivedCents)}</span>
                </div>
                <div className="cash-row">
                  <span>Wisselgeld</span>
                  <span className="cash-display strong">{formatEuro(changeCents)}</span>
                </div>
                <div className="numpad">
                  {numpadKeys.map((k) => (
                    <button key={k} className="numkey" onClick={() => setReceivedStr(updateDigits(receivedStr, k))}>{k}</button>
                  ))}
                </div>
              </div>
            )}

            {view === "GIFT_FLOW" && (
              <div className="gift-grid">
                <label className="gift-field">
                  <span>Bon code</span>
                  <input className="gift-input" value={giftCode} onChange={(e) => setGiftCode(e.target.value)} placeholder="—" />
                </label>
                <div className="pay-note">Cadeaubon (demo) — druk op Verder.</div>
              </div>
            )}

            {view === "CHECKOUT_COMPLETE" && (
              <div className="complete-grid">
                <div className="complete-title">Afgerond</div>
                <div>Methode: {methodLabel(method)}</div>
                <div>Totaal: {formatEuro(totalCents)}</div>
                <div className="complete-actions">
                  <button className="btn" onClick={() => console.log("print")}>Print bon</button>
                  <button className="btn" onClick={() => console.log("mail")}>Mail bon</button>
                </div>
              </div>
            )}
          </div>

          <div className="pay-actions-sticky">
            <button className="btn danger" onClick={onAbort}>Breek af</button>
            <button
              className="btn primary"
              onClick={view === "CHECKOUT_COMPLETE" ? onDone : onConfirm}
              disabled={
                (view === "CASH_HELP" && receivedCents < totalCents) ||
                (view === "CHECKOUT_IDLE" && method == null)
              }
            >
              {view === "CHECKOUT_COMPLETE" ? "Gereed (volgende klant)" : "Bevestig"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// Removed: FloatingLastReceipt (now shared via LastReceiptTrigger)

function methodLabel(m: PayMethod | null) {
  if (m === "CASH") return "Contant";
  if (m === "PIN") return "Pin";
  if (m === "GIFTCARD") return "Cadeaubon";
  return "—";
}

const numpadKeys = ["1","2","3","4","5","6","7","8","9","0","C","←"] as const;
function updateDigits(current: string, key: string): string {
  if (key === "C") return "";
  if (key === "←") return current.slice(0, -1);
  if (/^\d$/.test(key)) return current + key;
  return current;
}
