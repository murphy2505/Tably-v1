import { useEffect, useMemo, useState } from "react";
import { useUi } from "../../stores/uiStore";
import type { OrderDTO } from "../../api/pos/orders";
import { apiSearchCustomers, apiCreateCustomer, type CustomerDTO } from "../../api/loyalty";
import { apiGetOrder, apiLinkCustomerToOrder, apiUnlinkCustomerFromOrder, apiCreateOrder } from "../../api/pos/orders";
import { usePosSession } from "../../stores/posSessionStore";

function buildSearchQueryCandidates(q: string): string[] {
  const qTrim = q.trim();
  if (!qTrim) return [];
  const qStripped = qTrim.replace(/[\s-]/g, "");
  const candidates: string[] = [];
  if (/^06\d{3,}$/.test(qStripped)) {
    const e164 = "+31" + qStripped.slice(1);
    candidates.push(e164);
    candidates.push(qStripped);
    return candidates;
  }
  if(/^\+\d{2,}$/.test(qStripped)){
    candidates.push(qStripped);
    return candidates;
  }
  if (/^\d{2,6}$/.test(qStripped)) {
    candidates.push(qStripped);
    return candidates;
  }
  candidates.push(qTrim);
  return candidates;
}

type Props = {
  orderId?: string | null;
  activeOrderCustomer: OrderDTO["customer"] | undefined | null;
  onOrderUpdated: (order: OrderDTO) => void;
};

export default function CustomerPanelOverlay({ orderId, activeOrderCustomer, onOrderUpdated }: Props) {
  const { customerPanelOpen, customerPanelMode, customerPanelCustomerId, closeCustomerPanel, openCustomerPanel } = useUi();
  const { setActiveOrderId } = usePosSession();
  const [tab, setTab] = useState<"Overzicht" | "Historie" | "Wallets" | "Punten">("Overzicht");

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CustomerDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string; phone: string; email: string }>({ name: "", phone: "", email: "" });

  useEffect(() => {
    if (!customerPanelOpen) return;
    setError(null);
    setBusy(false);
    setTab("Overzicht");
    if (customerPanelMode === "SELECT") {
      setQuery("");
      setResults([]);
    }
  }, [customerPanelOpen, customerPanelMode]);

  async function doSearch() {
    try {
      setLoading(true);
      setError(null);
      const candidates = buildSearchQueryCandidates(query);
      let all: CustomerDTO[] = [];
      for (let i = 0; i < candidates.length; i++) {
        const resp = await apiSearchCustomers(candidates[i]);
        const found = resp.customers || [];
        all = found;
        if (found.length > 0) break;
      }
      setResults(all);
    } catch (e) {
      setError("Zoeken mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function createCustomer(linkAfterCreate: boolean) {
    if (!createForm.name.trim()) { setError("Naam is verplicht"); return; }
    try {
      setBusy(true);
      setError(null);
      const payload: any = { name: createForm.name.trim() };
      const ph = createForm.phone.trim();
      if (ph) {
        const stripped = ph.replace(/[\s-]/g, "");
        if (/^06\d{7}$/.test(stripped)) payload.phoneE164 = "+31" + stripped.slice(1);
        else if (/^\+\d{6,}$/.test(stripped)) payload.phoneE164 = stripped;
      }
      const em = createForm.email.trim();
      if (em) payload.email = em;
      const created = await apiCreateCustomer(payload);
      // Add to top of results and optionally link to order
      setResults((prev) => [created, ...prev]);
      if (linkAfterCreate) {
        await link(created.id);
      }
      setCreating(false);
      setCreateForm({ name: "", phone: "", email: "" });
    } catch (e) {
      setError("Aanmaken mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function link(customerId: string) {
    let targetOrderId = orderId || null;
    if (!targetOrderId) {
      try {
        setBusy(true);
        const created = await apiCreateOrder();
        targetOrderId = created.id;
        // Update session with the newly created active order id
        setActiveOrderId(created.id);
        const ord = await apiGetOrder(targetOrderId);
        onOrderUpdated(ord);
      } catch (e) {
        setError("Bon aanmaken mislukt");
        setBusy(false);
        return;
      }
    }
    try {
      setBusy(true);
      const linked = await apiLinkCustomerToOrder(targetOrderId!, customerId);
      // Prefer the response which includes customer immediately; then optionally refetch for completeness
      onOrderUpdated(linked);
      console.log("[CustomerPanelOverlay] activeOrder.customer after link:", linked?.customer);
      // Optional refetch (if backend omits some fields); merge/replace is handled by parent
      try {
        const ord = await apiGetOrder(targetOrderId!);
        onOrderUpdated(ord);
        console.log("[CustomerPanelOverlay] activeOrder.customer after refetch:", ord?.customer);
      } catch (_e) {
        // ignore refetch failure; we already updated with linked response
      }
      closeCustomerPanel();
    } catch (e) {
      setError("Koppelen mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    if (!orderId) { setError("Geen actieve bon"); return; }
    if (!window.confirm("Klant loskoppelen van bon?")) return;
    try {
      setBusy(true);
      const unlinked = await apiUnlinkCustomerFromOrder(orderId);
      onOrderUpdated(unlinked);
      console.log("[CustomerPanelOverlay] activeOrder.customer after unlink:", unlinked?.customer);
      try {
        const ord = await apiGetOrder(orderId);
        onOrderUpdated(ord);
        console.log("[CustomerPanelOverlay] activeOrder.customer after refetch:", ord?.customer);
      } catch (_e) {
        // ignore
      }
      closeCustomerPanel();
    } catch (e) {
      setError("Loskoppelen mislukt");
    } finally {
      setBusy(false);
    }
  }

  if (!customerPanelOpen) return null;

  const inCard = customerPanelMode === "CARD";
  const title = inCard ? (activeOrderCustomer?.name || activeOrderCustomer?.phoneE164 || "Klant") : "Klant kiezen";
  const sub = inCard ? (activeOrderCustomer?.phoneE164 || "") : "Zoek op naam of telefoon";

  return (
    <div className="cust-overlay" role="dialog" aria-modal>
      <div className="cust-overlay-topbar">
        <button className="btn" onClick={closeCustomerPanel} disabled={busy}>Annuleren</button>
        <div className="cust-overlay-title">
          <div className="cust-name">{title}</div>
          {sub && <div className="cust-sub">{sub}</div>}
        </div>
        <div className="cust-overlay-actions">
          {inCard ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => openCustomerPanel("SELECT", customerPanelCustomerId)} disabled={busy}>Wijzigen</button>
              <button className="btn" onClick={unlink} disabled={busy}>Loskoppelen</button>
            </div>
          ) : (
            <span />
          )}
        </div>
      </div>

      {inCard ? (
        <>
          <div className="cust-tabs">
            {(["Overzicht", "Historie", "Wallets", "Punten"] as const).map((t) => (
              <button key={t} className={`cust-tab ${t === tab ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div className="cust-body">
            <div className="cust-section">
              <div className="cust-section-title">{tab}</div>
              <div className="cust-section-content">Placeholder: {tab} content.</div>
            </div>
          </div>
        </>
      ) : (
        <div className="cust-body">
          <div className="cust-search" style={{ display: "flex", gap: 8 }}>
            <input
              className="orders-search"
              placeholder="Zoek op naam of telefoon"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button className="btn" onClick={doSearch} disabled={loading || (query.trim().length === 0)}>Zoek</button>
          </div>

          {error && <div style={{ color: "#991b1b" }}>{error}</div>}

          {loading ? (
            <div>Bezig met laden…</div>
          ) : results.length === 0 ? (
            <div style={{ color: "#6b7280" }}>Geen resultaten</div>
          ) : (
            <div className="cust-list" style={{ display: "grid", gap: 8 }}>
              {results.map((c) => (
                <div key={c.id} className="cust-list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", background: "#fff" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{c.name || c.phoneE164 || `Klant #${c.id.slice(-6)}`}</div>
                    {c.phoneE164 && <div style={{ fontSize: 12, color: "#6b7280" }}>{c.phoneE164}</div>}
                  </div>
                  <button className="btn primary" onClick={() => link(c.id)} disabled={busy}>Koppel</button>
                </div>
              ))}
            </div>
          )}
          <div className="cust-section" style={{ marginTop: 8 }}>
            {!creating ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>Nieuwe klant</div>
                <button className="btn" onClick={() => setCreating(true)}>Toevoegen</button>
              </div>
            ) : (
              <div className="settings-form" style={{ display: "grid", gap: 8 }}>
                <label>
                  <span>Naam</span>
                  <input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
                </label>
                <label>
                  <span>Telefoon</span>
                  <input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="06… of +31…" />
                </label>
                <label>
                  <span>Email</span>
                  <input value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
                </label>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => { setCreating(false); setCreateForm({ name: "", phone: "", email: "" }); }} disabled={busy}>Annuleren</button>
                  <button className="btn" onClick={() => createCustomer(false)} disabled={busy || !createForm.name.trim()}>Aanmaken</button>
                  <button className="btn primary" onClick={() => createCustomer(true)} disabled={busy || !createForm.name.trim()}>Aanmaken & koppelen</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
