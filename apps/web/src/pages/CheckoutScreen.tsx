import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOrders } from "../stores/ordersStore";
import { usePosSession } from "../stores/posSessionStore";
import { apiCreateOrder, apiGetOrder, apiPayOrder } from "../api/pos/orders";
import { apiPrintReceipt, apiPrintLastReceipt, apiPrintQr } from "../api/print";
import { getPosSettings } from "../api/settings";
import { sumupCreateCheckout, sumupPollCheckout } from "../api/payments";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

type PayMethod = "PIN" | "CASH" | "GIFTCARD" | "SUMUP";
type CheckoutView = "CHECKOUT_IDLE" | "CASH_HELP" | "GIFT_FLOW" | "SUMUP_WAIT" | "CHECKOUT_COMPLETE";

export type CheckoutStateV1 = { lines: { title: string; qty: number; priceCents: number; lineTotalCents: number }[]; totalCents: number };
export type CheckoutState = { orderId: string } | CheckoutStateV1;

export default function CheckoutScreen() {
  const navigate = useNavigate();
  const { orders, getTotalCents } = useOrders();
  const { activeOrderId, setActiveOrderId, clearActiveOrder } = usePosSession();

  // Lock the orderId when user selects a payment method to avoid stale/replaced orders during SUMUP_WAIT
  const lockedOrderIdRef = useRef<string | null>(null);

  // Canonical current order id comes from the session store
  const orderId: string | undefined = lockedOrderIdRef.current || activeOrderId || undefined;

  const order = orders.find((o) => o.id === orderId);
  const initialLines = order ? order.lines : [];
  const fallbackTotal = orderId ? getTotalCents(orderId) : 0;

  // Fetch the order fresh with backend totals
  const [serverOrder, setServerOrder] = useState<null | {
    id: string;
    lines: { title: string; qty: number; priceCents: number }[];
    subtotalExclVatCents: number;
    totalInclVatCents: number;
    vatBreakdown?: Record<string, { rateBps: number; grossCents: number; netCents: number; vatCents: number }>;
    receiptLabel?: string | null;
    draftLabel?: string | null;
  }>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!orderId) return;
      try {
        const o = await apiGetOrder(orderId);
        if (!alive) return;
        setServerOrder({
          id: o.id,
          lines: o.lines.map((l) => ({ title: l.title, qty: l.qty, priceCents: l.priceCents })),
          subtotalExclVatCents: o.subtotalExclVatCents ?? 0,
          totalInclVatCents: o.totalInclVatCents ?? 0,
          vatBreakdown: o.vatBreakdown as any,
          receiptLabel: (o as any).receiptLabel ?? null,
          draftLabel: (o as any).draftLabel ?? null,
        });
      } catch (_e) {
        // Keep fallback from local store
      }
    })();
    return () => { alive = false; };
  }, [orderId]);

  const lines = serverOrder?.lines ?? initialLines;
  const totalCents = serverOrder?.totalInclVatCents ?? fallbackTotal;
  const subtotalCents = serverOrder?.subtotalExclVatCents ?? lines.reduce((s, l) => s + l.qty * l.priceCents, 0);

  const [view, setView] = useState<CheckoutView>("CHECKOUT_IDLE");
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // CASH state
  const [receivedStr, setReceivedStr] = useState<string>("");
  const receivedCents = useMemo(() => {
    const v = parseInt(receivedStr || "0", 10);
    return Number.isFinite(v) ? v : 0;
  }, [receivedStr]);
  const changeCents = Math.max(0, receivedCents - totalCents);

  // GIFTCARD placeholder
  const [giftCode, setGiftCode] = useState<string>("");

  const vatLines = useMemo(() => {
    const map = serverOrder?.vatBreakdown || {};
    return Object.values(map).sort((a: any, b: any) => a.rateBps - b.rateBps);
  }, [serverOrder]);

  function selectMethod(next: PayMethod) {
    setMethod(next);
    if (!lockedOrderIdRef.current && activeOrderId) lockedOrderIdRef.current = activeOrderId;
    if (next === "CASH") {
      setReceivedStr(String(totalCents));
      setView("CASH_HELP");
    } else if (next === "PIN") setView("CHECKOUT_IDLE");
    else if (next === "SUMUP") setView("CHECKOUT_IDLE");
    else setView("GIFT_FLOW");
  }

  useEffect(() => {
    if (method === "CASH" && view === "CASH_HELP") {
      const current = parseInt(receivedStr || "0", 10) || 0;
      if (current === 0 || current < totalCents) setReceivedStr(String(totalCents));
    }
  }, [method, view, totalCents]);

  const [toast, setToast] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState(false);
  const [printingQr, setPrintingQr] = useState(false);
  const [autoPrinted, setAutoPrinted] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(true);

  // SumUp state
  const [sumupProviderCheckoutId, setSumupProviderCheckoutId] = useState<string | null>(null);
  const sumupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sumupStatus, setSumupStatus] = useState<string | null>(null);
  const [sumupLastPolledAt, setSumupLastPolledAt] = useState<number | null>(null);
  const [sumupStartedAt, setSumupStartedAt] = useState<number | null>(null);

  // POS Settings
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getPosSettings();
        if (!alive) return;
        setAutoPrintEnabled(s.autoPrintReceiptAfterPayment);
      } catch (_e) {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (sumupPollRef.current) {
        clearInterval(sumupPollRef.current);
        sumupPollRef.current = null;
      }
    };
  }, []);

  async function onConfirm() {
    const lockedOrderId = lockedOrderIdRef.current || null;
    if (!lockedOrderId || submitting) {
      if (!lockedOrderId) setToast("Geen bon geselecteerd");
      return;
    }
    const ok =
      method === "PIN" ||
      (method === "CASH" && receivedCents >= totalCents) ||
      method === "GIFTCARD" ||
      method === "SUMUP";
    if (!ok) return;

    let completed = false;
    try {
      setSubmitting(true);
      if (method === "PIN") {
        await apiPayOrder(orderId, { method: "PIN", paymentRef: "PIN-STUB" });
      } else if (method === "CASH") {
        await apiPayOrder(orderId, { method: "CASH", cashReceivedCents: receivedCents });
      } else if (method === "GIFTCARD") {
        await apiPayOrder(orderId, { method: "PIN", paymentRef: "GIFT-STUB" });
      } else if (method === "SUMUP") {
        try {
          console.log("[sumup] start", { lockedOrderId });
        } catch {}
        setSubmitting(false);
        const created = await sumupCreateCheckout(lockedOrderId);
        const pid = created?.providerCheckoutId || null;
        if (!pid) {
          setToast("SumUp checkout kon niet worden aangemaakt");
          return;
        }
        setSumupProviderCheckoutId(pid);
        setView("SUMUP_WAIT");
        setSumupStatus("PENDING");
        setSumupStartedAt(Date.now());
        setSumupLastPolledAt(null);
        if (sumupPollRef.current) {
          clearInterval(sumupPollRef.current);
          sumupPollRef.current = null;
        }
        sumupPollRef.current = setInterval(async () => {
          try {
            const res = await sumupPollCheckout(pid);
            const status = res?.status;
            setSumupStatus(status || null);
            setSumupLastPolledAt(Date.now());
            const started = sumupStartedAt || Date.now();
            if (Date.now() - started > 120000) {
              if (sumupPollRef.current) {
                clearInterval(sumupPollRef.current);
                sumupPollRef.current = null;
              }
              setToast("Timeout: geen bevestiging");
              setView("CHECKOUT_IDLE");
              return;
            }
            if (status === "PAID") {
              if (sumupPollRef.current) {
                clearInterval(sumupPollRef.current);
                sumupPollRef.current = null;
              }
              try {
                const o = await apiGetOrder(lockedOrderId);
                setServerOrder({
                  id: o.id,
                  lines: o.lines.map((l) => ({ title: l.title, qty: l.qty, priceCents: l.priceCents })),
                  subtotalExclVatCents: o.subtotalExclVatCents ?? 0,
                  totalInclVatCents: o.totalInclVatCents ?? 0,
                  vatBreakdown: o.vatBreakdown as any,
                  receiptLabel: (o as any).receiptLabel ?? null,
                  draftLabel: (o as any).draftLabel ?? null,
                });
              } catch {}
              setView("CHECKOUT_COMPLETE");
            } else if (status === "FAILED" || status === "EXPIRED" || status === "CANCELED") {
              if (sumupPollRef.current) {
                clearInterval(sumupPollRef.current);
                sumupPollRef.current = null;
              }
              setToast("SumUp betaling mislukt of verlopen");
              setView("CHECKOUT_IDLE");
            }
          } catch (_e) {
            // transient error
          }
        }, 1500);
        return;
      }
      try {
        const o = await apiGetOrder(lockedOrderId);
        setServerOrder({
          id: o.id,
          lines: o.lines.map((l) => ({ title: l.title, qty: l.qty, priceCents: l.priceCents })),
          subtotalExclVatCents: o.subtotalExclVatCents ?? 0,
          totalInclVatCents: o.totalInclVatCents ?? 0,
          vatBreakdown: o.vatBreakdown as any,
          receiptLabel: (o as any).receiptLabel ?? null,
          draftLabel: (o as any).draftLabel ?? null,
        });
      } catch {}
      completed = true;
    } catch (e: any) {
      const status = e?.response?.status;
      const code = e?.response?.data?.error?.message || e?.message;
      if (status === 409 && code === "ALREADY_FINALIZED") {
        completed = true;
      } else {
        console.warn("Checkout finalize failed", e);
        const msg = code ? `Bon afronden mislukt — ${String(code)}` : "Bon afronden mislukt — probeer opnieuw";
        setToast(msg);
      }
    } finally {
      if (method !== "SUMUP") {
        setSubmitting(false);
        if (completed) setView("CHECKOUT_COMPLETE");
      }
    }
  }
  // Auto-print receipt once after checkout complete (respect setting)
  useEffect(() => {
    (async () => {
      if (view !== "CHECKOUT_COMPLETE" || autoPrinted || !autoPrintEnabled) return;
      if (!orderId) return;
      try {
        setAutoPrinted(true);
        await apiPrintReceipt(orderId);
      } catch (e: any) {
        setToast("Bon printen mislukt — gebruik ‘Print laatste bon’");
      }
    })();
  }, [view, autoPrinted, orderId, autoPrintEnabled]);

  function onAbort() {
    if (sumupPollRef.current) {
      clearInterval(sumupPollRef.current);
      sumupPollRef.current = null;
    }
    lockedOrderIdRef.current = null;
    navigate("/pos");
  }
  const [creatingNext, setCreatingNext] = useState(false);
  async function onDone() {
    if (creatingNext) return;
    try {
      setCreatingNext(true);
      const created = await apiCreateOrder();
      setActiveOrderId(created.id);
      lockedOrderIdRef.current = null;
      navigate("/pos");
    } catch (_e) {
      // Fallback: still return to POS; cashier can create manually
      navigate("/pos");
    } finally {
      setCreatingNext(false);
    }
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
      {toast && (
        <div style={{ position: "fixed", right: 16, bottom: 16, background: "#111827", color: "white", padding: "10px 14px", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,0.25)", zIndex: 1001 }}>
          {toast}
        </div>
      )}
      {/* No floating trigger; placed in bottom bar */}

      <div className="checkout-grid">
        {/* LEFT column */}
        <section className="checkout-left">
          <div className="receipt-panel">
            <div className="receipt-header">
              {(() => {
                const label = serverOrder?.receiptLabel || serverOrder?.draftLabel;
                return label ? (
                  <div className="bon-title-number">Bon {label}</div>
                ) : (
                  <div className="receipt-title">Bon</div>
                );
              })()}
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
              <div className="sum-row"><span>Subtotaal (excl. btw)</span><span>{formatEuro(subtotalCents)}</span></div>
              {vatLines.length === 0 ? (
                <div className="sum-row"><span>BTW</span><span>—</span></div>
              ) : (
                vatLines.map((v, i) => (
                  <div key={i} className="sum-row"><span>BTW {(v.rateBps/100).toFixed(0)}%</span><span>{formatEuro(v.vatCents)}</span></div>
                ))
              )}
              <div className="sum-row sum-total"><span>Totaal</span><span>{formatEuro(totalCents)}</span></div>
            </div>
          </div>
        </section>

        {/* RIGHT column */}
        <section className="checkout-right">
          <div className="pay-tiles stacked">
            <button className={`pay-tile large soft-green ${method === "CASH" ? "active" : ""}`} onClick={() => selectMethod("CASH")} disabled={view === "SUMUP_WAIT"}>Contant</button>
            <button className={`pay-tile large soft-blue ${method === "PIN" ? "active" : ""}`} onClick={() => selectMethod("PIN")} disabled={view === "SUMUP_WAIT"}>Pin</button>
            <button className={`pay-tile large soft-purple ${method === "GIFTCARD" ? "active" : ""}`} onClick={() => selectMethod("GIFTCARD")} disabled={view === "SUMUP_WAIT"}>Kadobon</button>
            <button className={`pay-tile large soft-blue ${method === "SUMUP" ? "active" : ""}`} onClick={() => selectMethod("SUMUP")} disabled={view === "SUMUP_WAIT"}>SumUp</button>
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

            {view === "SUMUP_WAIT" && (
              <div className="gift-grid">
                <div className="complete-title">Wachten op SumUp betaling…</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{formatEuro(totalCents)}</div>
                <div style={{ opacity: 0.8 }}>
                  Bon {serverOrder?.receiptLabel || serverOrder?.draftLabel || orderId}
                </div>
                <div style={{ marginTop: 8 }}>
                  Status: <span style={{ fontWeight: 600 }}>{(sumupStatus || "PENDING").toString()}</span>
                </div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  Laatst gecheckt: {sumupLastPolledAt ? new Date(sumupLastPolledAt).toLocaleTimeString() : "—"}
                </div>
                {sumupProviderCheckoutId && (
                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 8 }}>Checkout-ID: {sumupProviderCheckoutId}</div>
                )}
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn danger"
                    onClick={() => {
                      if (sumupPollRef.current) {
                        clearInterval(sumupPollRef.current);
                        sumupPollRef.current = null;
                      }
                      lockedOrderIdRef.current = null;
                      setView("CHECKOUT_IDLE");
                    }}
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}

            {view === "CHECKOUT_COMPLETE" && (
              <div className="complete-grid">
                <div className="complete-title">Afgerond</div>
                <div>Methode: {methodLabel(method)}</div>
                <div>Totaal: {formatEuro(totalCents)}</div>
                <div className="complete-actions">
                  <button
                    className="btn"
                    disabled={printingOrder}
                    onClick={async () => {
                      if (!orderId) return;
                      try {
                        setPrintingOrder(true);
                        await apiPrintReceipt(orderId);
                        setToast("Geprint");
                      } catch (e: any) {
                        setToast(e?.message || "Print mislukt");
                      } finally {
                        setPrintingOrder(false);
                      }
                    }}
                  >
                    {printingOrder ? "Printen…" : "Print laatste bon"}
                  </button>
                  <button
                    className="btn"
                    disabled={printingQr}
                    onClick={async () => {
                      if (!orderId) return;
                      try {
                        setPrintingQr(true);
                        const qrText = `tably://loyalty/demo/order/${orderId}`;
                        await apiPrintQr(qrText, { title: "Spaarkaart", subtitle: "Scan om punten te sparen" });
                        setToast("Geprint");
                      } catch (e: any) {
                        setToast(e?.message || "Print mislukt");
                      } finally {
                        setPrintingQr(false);
                      }
                    }}
                  >
                    {printingQr ? "Printen…" : "Print QR klantenkaart"}
                  </button>
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
                (view === "CHECKOUT_IDLE" && method == null) ||
                submitting || creatingNext || view === "SUMUP_WAIT"
              }
            >
              {view === "CHECKOUT_COMPLETE" ? "Gereed (volgende klant)" : "Bevestig"}
            </button>
            {view === "CHECKOUT_COMPLETE" && (
              <button
                className="btn"
                style={{ marginLeft: 8 }}
                onClick={async () => {
                  try {
                    const oid = await apiPrintLastReceipt();
                    setToast(oid ? "Laatste bon geprint" : "Geprint");
                  } catch (e: any) {
                    const msg = e?.message || "Print mislukt";
                    setToast(/NO_PAID_ORDER/.test(msg) ? "Geen betaalde bon gevonden" : msg);
                  }
                }}
              >
                Print laatste bon
              </button>
            )}
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
  if (m === "SUMUP") return "SumUp";
  return "—";
}

const numpadKeys = ["1","2","3","4","5","6","7","8","9","0","C","←"] as const;
function updateDigits(current: string, key: string): string {
  if (key === "C") return "";
  if (key === "←") return current.slice(0, -1);
  if (/^\d$/.test(key)) {
    // Append digit; cap length to avoid overflow (max 9 digits ≈ €9,999,999.99)
    const next = current + key;
    return next.slice(0, 9);
  }
  return current;
}
