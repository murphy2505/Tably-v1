import { useEffect, useMemo, useState } from "react";
import { apiCreateCustomer, apiSearchCustomers, type CustomerDTO } from "../../api/loyalty";
import { apiLinkCustomerToOrder, apiUnlinkCustomerFromOrder, type OrderDTO } from "../../api/pos/orders";

function normalizePhoneToE164NL(input: string): string | null {
  const v = input.replace(/\s+/g, "");
  if (!v) return null;
  if (/^\+31\d{9}$/.test(v)) return v; // already E.164 for NL (including +316…)
  if (/^06\d{8}$/.test(v)) return "+31" + v.slice(1); // 06XXXXXXXX -> +316XXXXXXXX
  if (/^\+316\d{8}$/.test(v)) return v; // +316XXXXXXXX
  return null; // unsupported format; let backend handle if needed
}

function buildSearchQueryCandidates(q: string): string[] {
  const qTrim = q.trim();
  if (!qTrim) return [];
  const qStripped = qTrim.replace(/[\s-]/g, "");
  const candidates: string[] = [];
  // If it starts with 06, prefer normalized E.164 first, then raw as fallback
  if (/^06\d{3,}$/.test(qStripped)) {
    const e164 = "+31" + qStripped.slice(1);
    candidates.push(e164);
    candidates.push(qStripped);
    return candidates;
  }
  // If it starts with +, search as-is
  if (/^\+\d{2,}$/.test(qStripped)) {
    candidates.push(qStripped);
    return candidates;
  }
  // Digits-only short input (last 4-6) → search as-is
  if (/^\d{2,6}$/.test(qStripped)) {
    candidates.push(qStripped);
    return candidates;
  }
  // Default: name/email/other → search trimmed
  candidates.push(qTrim);
  return candidates;
}

type Props = {
  open: boolean;
  orderId: string; // required per spec; ensure before opening
  customer: OrderDTO["customer"] | undefined | null;
  onClose: () => void;
  onOrderUpdated: (order: OrderDTO) => void;
};

export default function CustomerModal({ open, orderId, customer, onClose, onOrderUpdated }: Props) {
  const [tab, setTab] = useState<"search" | "detail">("search");
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<CustomerDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const canCreate = useMemo(() => {
    const phone = normalizePhoneToE164NL(newPhone);
    return !!phone || (newName.trim().length > 0);
  }, [newPhone, newName]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setResults([]);
    setQuery("");
    setTab(customer ? "detail" : "search");
  }, [open, customer]);

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
        // Stop early if we got hits for prioritized candidate
        if (found.length > 0) break;
      }
      setResults(all);
    } catch (e) {
      setError("Zoeken mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function link(orderId: string, customerId: string) {
    try {
      const updated = await apiLinkCustomerToOrder(orderId, customerId);
      onOrderUpdated(updated);
      console.log("[CustomerModal] order.customer after link", updated?.customer);
      onClose();
    } catch (e) {
      setError("Koppelen mislukt");
    }
  }

  async function unlink(orderId: string) {
    try {
      const updated = await apiUnlinkCustomerFromOrder(orderId);
      onOrderUpdated(updated);
      onClose();
      console.log("[CustomerModal] order.customer after unlink", updated?.customer);
    } catch (e) {
      setError("Loskoppelen mislukt");
    }
  }

  async function createAndLink() {
    if (!orderId) return;
    try {
      setCreating(true);
      const phoneE164 = normalizePhoneToE164NL(newPhone);
      const created = await apiCreateCustomer({ name: newName || undefined, phoneE164: phoneE164 || undefined });
      await link(orderId, created.id);
    } catch (e) {
      setError("Aanmaken mislukt");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="checkout-modal-overlay" onClick={() => onClose()}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16, width: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 900 }}>Klant</div>
          <button className="btn" onClick={onClose}>Sluiten</button>
        </div>

        {error && <div style={{ color: "#991b1b", marginTop: 8 }}>{error}</div>}

        {!customer ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="orders-search"
                placeholder="Zoek op naam of telefoon"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="btn" onClick={doSearch} disabled={loading || query.trim().length === 0}>Zoek</button>
            </div>

            {loading ? (
              <div>Bezig met laden…</div>
            ) : results.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Geen resultaten</div>
            ) : (
              <div className="order-list">
                {results.map((c) => (
                  <div key={c.id} className="order-line" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="order-line-title">{c.name || c.phoneE164 || `Klant #${c.id.slice(-6)}`}</div>
                      {c.loyalty && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>Punten: {c.loyalty.points}</div>
                      )}
                    </div>
                    <button className="btn primary" disabled={!orderId} onClick={() => orderId && link(orderId, c.id)}>Koppel aan bon</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Nieuw + koppel</div>
              <div style={{ display: "grid", gap: 8 }}>
                <input className="orders-search" placeholder="Naam (optioneel)" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input className="orders-search" placeholder="Telefoon (06… of +316…)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                <button className="btn primary" disabled={!orderId || creating || !canCreate} onClick={createAndLink}>
                  {creating ? "Bezig…" : "Nieuw + koppel"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>{customer?.name || customer?.phoneE164 || `Klant #${customer?.id?.slice(-6)}`}</div>
              {customer?.loyalty && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>Punten: {customer.loyalty.points}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => setTab("search")}>Zoek andere klant</button>
              <button className="btn danger" disabled={!orderId} onClick={() => orderId && unlink(orderId!)}>Loskoppelen van bon</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
