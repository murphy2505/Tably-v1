import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders, type OrderLine } from "./stores/ordersStore";
import { apiCreateOrder, apiAddOrderLine, apiGetOrder, apiTransitionOrder, type OrderDTO } from "./api/pos/orders";
import { usePosSession } from "./stores/posSessionStore";
import LastReceiptTrigger from "./components/LastReceiptTrigger";
import { fetchActivePosMenu } from "./api/pos";
import type { PosMenuDTO } from "./types/pos";
import { useKds } from "./stores/kdsStore";
import { apiGetProductModifierGroups } from "./api/pos/modifiers";
import ModifierSheet from "./components/pos/ModifierSheet";

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

  const {
    currentOrderId,
    getCurrentOrder,
    addLine,
    removeLine,
    clearCurrentOrder,
    getItemsCount,
    getTotalCents,
    setCurrentOrder,
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

  const { activeOrderId, setActiveOrderId, clearActiveOrder } = usePosSession();
  const [activeOrder, setActiveOrder] = useState<OrderDTO | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { sentCount, refreshCounts } = useKds();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const totalCents = activeOrder ? activeOrder.lines.reduce((s, l) => s + l.qty * l.priceCents, 0) : 0;
  const itemsCount = activeOrder ? activeOrder.lines.reduce((s, l) => s + l.qty, 0) : 0;

  // last receipt is handled via LastReceiptTrigger component
  // Ensure initial fetch for badge at POS mount
  useEffect(() => {
    refreshCounts(true);
  }, []);

  function syncLocalStoreFromOrder(ord: OrderDTO) {
    try {
      setCurrentOrder(ord.id);
      clearCurrentOrder();
      for (const line of ord.lines) {
        addLine(line.id, line.title, line.priceCents, line.qty);
      }
    } catch (e) {
      console.warn("syncLocalStoreFromOrder failed", e);
    }
  }

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<{ id: string; name: string; priceCents: number } | null>(null);
  const [sheetGroups, setSheetGroups] = useState<Array<{ id: string; name: string; minSelect: number; maxSelect: number; options: { id: string; name: string; priceDeltaCents: number }[] }>>([]);

  async function addItemToOrder(item: PosMenuDTO["items"][number]) {
    try {
      let targetOrderId = activeOrderId;
      if (!targetOrderId) {
        const created = await apiCreateOrder();
        targetOrderId = created.id;
        setActiveOrderId(created.id);
        setActiveOrder(created);
        syncLocalStoreFromOrder(created);
      }
      const pid = item.product.id; // product id
      // Check modifiers
      try {
        const resp = await apiGetProductModifierGroups(pid);
        const groups = resp.groups || [];
        if (groups.length > 0) {
          setSheetProduct({ id: pid, name: item.product.name, priceCents: item.priceCents });
          setSheetGroups(groups);
          setSheetOpen(true);
          return; // wait for confirm
        }
      } catch (_e) {
        // If fetching modifiers fails, fall back to instant add
      }
      const updated = await apiAddOrderLine(targetOrderId!, pid, 1);
      setActiveOrder(updated);
      syncLocalStoreFromOrder(updated);
    } catch (e) {
      console.warn("addItemToOrder failed", e);
    }
  }

  // Hydrate active order when switching via recall
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!activeOrderId) {
        setActiveOrder(null);
        return;
      }
      try {
        const ord = await apiGetOrder(activeOrderId);
        if (!cancelled) {
          setActiveOrder(ord);
          syncLocalStoreFromOrder(ord);
        }
      } catch (e) {
        console.warn("hydrate active order failed", e);
        if (!cancelled) {
          // Clear invalid/404 order ids to keep POS usable
          clearActiveOrder();
          setActiveOrder(null);
        }
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [activeOrderId]);

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
        {toast && (
          <div style={{ position: "fixed", right: 16, bottom: 72, background: "#111827", color: "white", padding: "10px 14px", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,0.25)", zIndex: 1001 }}>
            {toast}
          </div>
        )}
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
                <div className="bon-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

            <div className={`order-list ${!activeOrder || activeOrder.lines.length === 0 ? "empty" : ""}`}>
              {!activeOrder || activeOrder.lines.length === 0 ? (
                <div>Nog geen items</div>
              ) : (
                activeOrder.lines.map((l) => (
                  <div key={l.id} className="order-line">
                    <div className="order-line-title">{l.title}</div>
                    <div className="order-line-meta">
                      <span className="qty">{l.qty}×</span>
                      <span className="line-total">{formatEuro(l.qty * l.priceCents)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="actions">
              <div className="action-buttons">
                {activeOrder && activeOrder.status === "OPEN" && (
                  <button
                    className="btn primary"
                    onClick={async () => {
                      if (!activeOrderId) return;
                      try {
                        setSending(true);
                        await apiTransitionOrder(activeOrderId, "SENT");
                        clearActiveOrder();
                        setActiveOrder(null);
                        // refresh KDS badge count optimistically
                        refreshCounts(true);
                      } catch (e) {
                        console.warn("send to kitchen failed", e);
                        setToast("Verzenden naar keuken mislukt");
                      } finally {
                        setSending(false);
                      }
                    }}
                    disabled={sending}
                  >
                    Naar keuken
                  </button>
                )}
                <button
                  className="btn"
                  onClick={async () => {
                    try {
                      const created = await apiCreateOrder();
                      setActiveOrderId(created.id);
                      setActiveOrder(created);
                      // mirror to local store for checkout compatibility
                      setCurrentOrder(created.id);
                      clearCurrentOrder();
                      for (const line of created.lines) {
                        addLine(line.id, line.title, line.priceCents, line.qty);
                      }
                    } catch (e) {
                      console.warn("new order create failed", e);
                    }
                  }}
                >
                  Nieuwe bon
                </button>
                <button className="btn" onClick={() => { clearActiveOrder(); setActiveOrder(null); }}>
                  Hold
                </button>
                <button className="btn danger" onClick={() => { clearActiveOrder(); setActiveOrder(null); }}>
                  Breek af
                </button>
                <button
                  className="btn success"
                  onClick={() => activeOrderId && navigate("/checkout", { state: { orderId: activeOrderId } })}
                  disabled={!activeOrder || activeOrder.lines.length === 0}
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
        <button
          className="bar-btn"
          onClick={() => { clearActiveOrder(); setActiveOrder(null); }}
          disabled={!activeOrderId}
        >
          Hold
        </button>
        <button className="bar-btn" onClick={() => navigate("/orders")}>
          Bestellingen
        </button>

        <LastReceiptTrigger variant="bottombar" />

        <button className="bar-btn" onClick={() => navigate("/kds")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            KDS
            {sentCount != null && sentCount > 0 && (
              <span style={{ fontSize: 12, lineHeight: 1, padding: "2px 6px", borderRadius: 999, background: "#111827", color: "#fff" }}>{sentCount}</span>
            )}
          </span>
        </button>
      </div>

      {/* Modifiers bottom sheet */}
      {sheetProduct && (
        <ModifierSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          product={sheetProduct}
          groups={sheetGroups}
          onConfirm={async (selectedOptionIds) => {
            setSheetOpen(false);
            if (!activeOrderId) return;
            try {
              const updated = await apiAddOrderLine(activeOrderId, sheetProduct.id, 1, selectedOptionIds);
              setActiveOrder(updated);
              syncLocalStoreFromOrder(updated);
            } catch (e) {
              console.warn("add with modifiers failed", e);
            }
          }}
        />
      )}

    </div>
  );
}
