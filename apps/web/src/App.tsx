import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "./stores/ordersStore";
import { fetchActivePosMenu } from "./api/pos";
import type { PosMenuDTO } from "./types/pos";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function categoryLabelFromItem(item: PosMenuDTO["items"][number]): string {
  return item.course?.shortLabel ?? item.course?.name ?? "Overig";
}

export function App() {
  const navigate = useNavigate();

  const [menu, setMenu] = useState<PosMenuDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>("Alles");
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(false);
  const [mobileTab, setMobileTab] = useState<"producten" | "bon">("producten");

  const [lastReceiptOpen, setLastReceiptOpen] = useState(false);

  const {
    currentOrderId,
    getCurrentOrder,
    addLine,
    removeLine,
    clearCurrentOrder,
    getItemsCount,
    getTotalCents,
    getLastPaidOrder,
  } = useOrders();

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    fetchActivePosMenu(ac.signal)
      .then((resp) => {
        setMenu(resp.data);
        setError(null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const categories = useMemo(() => {
    const base = new Map<string, number>();
    const items = menu?.items ?? [];
    for (const it of items) {
      const label = categoryLabelFromItem(it);
      base.set(label, (base.get(label) ?? 0) + 1);
    }
    const arr = Array.from(base.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return [{ label: "Alles", count: items.length }, ...arr.map(([label, count]) => ({ label, count }))];
  }, [menu]);

  const filteredItems = useMemo(() => {
    let items = menu?.items ?? [];

    if (activeCategory !== "Alles") {
      items = items.filter((it) => categoryLabelFromItem(it) === activeCategory);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter((it) => {
        const title = it.variant ? it.variant.name : it.product.name;
        const subtitle = it.variant ? it.product.name : it.product.description ?? "";
        return title.toLowerCase().includes(q) || subtitle.toLowerCase().includes(q);
      });
    }

    return items;
  }, [menu, activeCategory, search]);

  const currentOrder = getCurrentOrder();
  const totalCents = getTotalCents(currentOrderId);
  const itemsCount = getItemsCount(currentOrderId);

  const lastPaid = getLastPaidOrder();

  function addItemToOrder(item: PosMenuDTO["items"][number]) {
    const id = item.id;
    const title = item.variant ? item.variant.name : item.product.name;
    const priceCents = item.priceCents;
    addLine(id, title, priceCents, 1);
  }

  const statusClass = loading ? "loading" : error ? "error" : "ready";
  const statusLabel = loading ? "Loading" : error ? "Error" : "Ready";

  return (
    <div className={`app light ${compact ? "compact" : ""}`}>
      <header className="topbar light">
        <div className="topbar-left">Tably POS</div>
        <div className="topbar-center">{menu?.name ?? "—"}</div>
        <div className="topbar-right">
          <div className={`status-pill ${statusClass}`}>{statusLabel}</div>
          <label className="compact-toggle">
            <input type="checkbox" checked={compact} onChange={() => setCompact((v) => !v)} />
            <span>Compact</span>
          </label>
        </div>
      </header>

      <div className="container pos-with-bottombar">
        <div className="mobile-tabs">
          <button className={`tab ${mobileTab === "producten" ? "active" : ""}`} onClick={() => setMobileTab("producten")}>
            Producten
          </button>
          <button className={`tab ${mobileTab === "bon" ? "active" : ""}`} onClick={() => setMobileTab("bon")}>
            Bon
          </button>
        </div>

        <div className={`pos-body ${mobileTab === "bon" ? "show-bon" : "show-producten"}`}>
          {/* Left column: categories */}
          <aside className="pos-left">
            <div className="category-list">
              {categories.map((c) => (
                <button
                  key={c.label}
                  className={`cat-btn ${activeCategory === c.label ? "active" : ""}`}
                  onClick={() => setActiveCategory(c.label)}
                >
                  <span className="cat-label">{c.label}</span>
                  <span className="cat-count">{c.count}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Middle column: products */}
          <section className="pos-middle">
            <div className="search-bar">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoeken…" />
            </div>

            <div className="product-grid">
              {filteredItems.map((item) => {
                const title = item.variant ? item.variant.name : item.product.name;
                const subtitle = item.variant ? item.product.name : item.product.description ?? "";
                const courseBadge = categoryLabelFromItem(item);

                return (
                  <button className="product-tile" key={item.id} onClick={() => addItemToOrder(item)}>
                    <div className="tile-badge">{courseBadge}</div>
                    <div className="tile-title light-text">{title}</div>
                    {subtitle && <div className="tile-subtitle">{subtitle}</div>}
                    <div className="tile-price">{formatEuro(item.priceCents)}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right column: bon + actions */}
          <aside className="pos-right">
            <div className="bon-header">
              <div className="bon-header-top">
                <div className="bon-title">Bon</div>
                <div className="bon-actions">
                  <span className={`status-chip ${statusClass}`}>{statusLabel}</span>
                </div>
              </div>

              <div className="bon-total">
                <div className="bon-total-label">Totaal</div>
                <div className="bon-total-value">{formatEuro(totalCents)}</div>
              </div>

              <div className="bon-meta">
                <div>BTW: —</div>
                <div>Items: {itemsCount}</div>
              </div>
            </div>

            <div className={`order-list ${currentOrder.lines.length === 0 ? "empty" : ""}`}>
              {currentOrder.lines.length === 0 ? (
                <div>Nog geen items</div>
              ) : (
                currentOrder.lines.map((l) => (
                  <div key={l.id} className="order-line">
                    <div className="order-line-title">{l.title}</div>
                    <div className="order-line-meta">
                      <span className="qty">{l.qty}×</span>
                      <span className="line-total">{formatEuro(l.qty * l.priceCents)}</span>
                    </div>
                    <button className="order-line-remove" onClick={() => removeLine(l.id)}>
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="actions">
              <div className="action-buttons">
                <button className="btn danger" onClick={clearCurrentOrder}>
                  Breek af
                </button>
                <button
                  className="btn success"
                  onClick={() => navigate("/checkout", { state: { orderId: currentOrderId } })}
                  disabled={currentOrder.lines.length === 0}
                >
                  Betaal
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* POS Bottom Bar */}
      <div className="pos-bottombar">
        <button className="bar-btn" onClick={() => navigate("/orders")}>
          Bestellingen
        </button>

        <button className="bar-btn" onClick={() => setLastReceiptOpen(true)}>
          Laatste bon
        </button>

        <button
          className="bar-btn"
          onClick={() => {
            if (!lastPaid) {
              console.log("no-last-paid");
              setLastReceiptOpen(true);
              return;
            }
            console.log("print-last", lastPaid.id);
          }}
        >
          Print laatste bon
        </button>

        <button className="bar-btn ghost" disabled title="Volgende fase">
          KDS
        </button>
      </div>

      {/* Laatste bon modal */}
      {lastReceiptOpen && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLastReceiptOpen(false);
          }}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Laatste bon</div>
              <button className="modal-close" onClick={() => setLastReceiptOpen(false)}>
                Sluiten
              </button>
            </div>

            <div className="modal-body">
              {!lastPaid ? (
                <p>Nog geen bon beschikbaar.</p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 900 }}>Bon #{lastPaid.id.slice(-6)}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {new Date(lastPaid.paidAt ?? lastPaid.createdAt).toLocaleString("nl-NL")}
                  </div>

                  <div style={{ borderTop: "1px dashed #e5e7eb", paddingTop: 8, display: "grid", gap: 6 }}>
                    {lastPaid.lines.slice(0, 8).map((l) => (
                      <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span>{l.title}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{l.qty}×</span>
                      </div>
                    ))}
                    {lastPaid.lines.length > 8 && (
                      <div style={{ color: "#6b7280", fontSize: 12 }}>+ {lastPaid.lines.length - 8} regels</div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6 }}>
                    <span style={{ color: "#6b7280" }}>Totaal</span>
                    <span style={{ fontWeight: 900 }}>{formatEuro(lastPaid.lines.reduce((s, l) => s + l.qty * l.priceCents, 0))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setLastReceiptOpen(false)}>
                Sluiten
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  if (!lastPaid) return;
                  console.log("print-last-receipt", lastPaid.id);
                }}
                disabled={!lastPaid}
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
