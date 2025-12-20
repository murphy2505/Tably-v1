import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOrdersList, type OrderListItem } from "../api/orders";
import { apiPrintReceipt } from "../api/print";
import { usePosSession } from "../stores/posSessionStore";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hhmm = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const ddmm = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return isToday ? hhmm : `${hhmm} • ${ddmm}`;
}

type StatusFilter = "ALL" | "OPEN" | "KITCHEN" | "READY" | "PAID" | "CANCELLED" | "COMPLETED" | "CONCEPT";
const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "Alles" },
  { key: "OPEN", label: "Open" },
  { key: "KITCHEN", label: "In keuken" },
  { key: "READY", label: "Gereed" },
  { key: "PAID", label: "Betaald" },
  { key: "CANCELLED", label: "Geannuleerd" },
  { key: "COMPLETED", label: "Afgerond" },
  { key: "CONCEPT", label: "Concept" },
];

type DateQuick = "TODAY" | "YESTERDAY" | "WEEK" | "ALL";
const DATE_CHIPS: { key: DateQuick; label: string }[] = [
  { key: "TODAY", label: "Vandaag" },
  { key: "YESTERDAY", label: "Gisteren" },
  { key: "WEEK", label: "Deze week" },
  { key: "ALL", label: "Alles" },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const { setActiveOrderId } = usePosSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);

  const [search, setSearch] = useState<string>(() => localStorage.getItem("orders.search") ?? "");
  const [status, setStatus] = useState<StatusFilter>(() => (localStorage.getItem("orders.status") as StatusFilter) || "ALL");
  const [dateQuick, setDateQuick] = useState<DateQuick>(() => (localStorage.getItem("orders.date") as DateQuick) || "TODAY");

  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchOrdersList();
      const list: OrderListItem[] = raw.map((o) => ({
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: (o as any).updatedAt ?? o.completedAt ?? o.cancelledAt ?? o.readyAt ?? o.inPrepAt ?? o.sentAt ?? o.createdAt,
        totalInclVatCents: o.totalInclVatCents ?? o.lines.reduce((s, l) => s + l.qty * l.priceCents, 0),
        receiptLabel: (o as any).receiptLabel ?? null,
        receiptIssuedAt: (o as any).receiptIssuedAt ?? null,
        draftLabel: (o as any).draftLabel ?? null,
        draftNo: (o as any).draftNo ?? null,
        customerName: null,
        // include kind for filtering if present
        kind: (o as any).kind ?? "QUICK",
      }));
      // sort desc by createdAt
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list.slice(0, 200));
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Kon bestellingen niet laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // persist filters
  useEffect(() => { localStorage.setItem("orders.search", search); }, [search]);
  useEffect(() => { localStorage.setItem("orders.status", status); }, [status]);
  useEffect(() => { localStorage.setItem("orders.date", dateQuick); }, [dateQuick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfDay.getTime() - 24 * 3600 * 1000);
    const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() || 7 - 1) * 24 * 3600 * 1000);

    return orders.filter((o: any) => {
      // status
      if (status === "OPEN" && o.status !== "OPEN") return false;
      if (status === "READY" && o.status !== "READY") return false;
      if (status === "PAID" && o.status !== "PAID") return false;
      if (status === "CANCELLED" && !(o.status === "CANCELLED" || o.status === "VOIDED")) return false;
      if (status === "COMPLETED" && o.status !== "COMPLETED") return false;
      if (status === "KITCHEN" && !(o.status === "SENT" || o.status === "IN_PREP")) return false;
      if (status === "CONCEPT") {
        const isConcept = (o.status === "PARKED") || (o.kind === "QUICK" && o.status === "OPEN" && !!o.draftLabel);
        if (!isConcept) return false;
      } else {
        // Default cleanliness: hide quick-open noise
        const hideQuickNoise = (o.kind === "QUICK" && o.status === "OPEN" && !o.receiptLabel && !(o.draftLabel && o.draftLabel.length > 0));
        if (hideQuickNoise) return false;
      }

      // date quick
      const t = new Date(o.createdAt).getTime();
      if (dateQuick === "TODAY" && t < startOfDay.getTime()) return false;
      if (dateQuick === "YESTERDAY" && (t < startOfYesterday.getTime() || t >= startOfDay.getTime())) return false;
      if (dateQuick === "WEEK" && t < startOfWeek.getTime()) return false;

      // search
      if (q) {
        const tail = o.id.slice(-6).toLowerCase();
        const hay = [o.receiptLabel || "", String(o.draftNo || ""), o.draftLabel || "", o.customerName || "", tail].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, status, dateQuick]);

  function displayNumber(o: OrderListItem): string {
    if (o.receiptLabel) return `Bon ${o.receiptLabel}`;
    if (o.status === "PAID") return `Bon ${o.receiptLabel ?? "—"}`;
    if (o.draftNo != null) return `Bon #${o.draftNo}`;
    if (o.draftLabel) return `Bon ${o.draftLabel}`;
    return `Bon (concept) #${o.id.slice(-6)}`;
  }
  function statusClass(s: string) {
    const k = s.toLowerCase();
    if (k === "paid") return "status-chip status-chip--paid";
    if (k === "open") return "status-chip status-chip--open";
    if (k === "ready") return "status-chip status-chip--ready";
    if (k === "sent" || k === "in_prep") return "status-chip status-chip--kitchen";
    if (k === "cancelled" || k === "voided") return "status-chip status-chip--cancelled";
    if (k === "completed") return "status-chip status-chip--completed";
    return "status-chip";
  }

  return (
    <div className="orders-layout">
      <div className="orders-topbar">
        <div className="orders-topbar-left">
          <div className="orders-topbar-title">Bestellingen</div>
          <div className="orders-topbar-sub">Open, in keuken en betaalde bonnen</div>
        </div>
        <div className="orders-topbar-right">
          <input
            className="orders-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoeken…"
          />
        </div>
      </div>

      <div className="orders-filters">
        <div className="orders-status-chips">
          {STATUS_CHIPS.map((c) => (
            <button key={c.key} className={`chip ${status === c.key ? "active" : ""}`} onClick={() => setStatus(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="orders-date-chips">
          {DATE_CHIPS.map((c) => (
            <button key={c.key} className={`chip ${dateQuick === c.key ? "active" : ""}`} onClick={() => setDateQuick(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="orders-content">
        <div className="orders-list">
          {loading && <div>Loading…</div>}
          {error && (
            <div className="orders-error">
              <div>Fout: {error}</div>
              <button className="btn" onClick={load}>Opnieuw</button>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="orders-empty">Geen bestellingen gevonden</div>
          )}

          {!loading && !error && filtered.map((o) => (
            <div key={o.id} className="order-row" onClick={() => { setActiveOrderId(o.id); navigate("/pos"); }}>
              <div className="order-row-left">
                <div className="order-row-number">{displayNumber(o)}</div>
                <div className="order-row-meta">
                  <span>{timeLabel(o.createdAt)}</span>
                  {o.draftNo != null && o.receiptLabel && <span>• Concept #{o.draftNo}</span>}
                </div>
              </div>
              <div className="order-row-right">
                <div className="order-row-total">{formatEuro(o.totalInclVatCents)}</div>
                <span className={statusClass(o.status)}>{o.status}</span>
                <button
                  className="btn"
                  disabled={actingId === o.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!o.receiptLabel) return; // only print paid
                    setActingId(o.id);
                    apiPrintReceipt(o.id)
                      .catch(() => {})
                      .finally(() => setActingId(null));
                  }}
                >
                  Print
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="orders-detail-panel">
          {/* Phase 2: detail panel (stub) */}
          <div className="orders-detail-stub">Selecteer een bon voor details</div>
        </div>
      </div>
    </div>
  );
}
