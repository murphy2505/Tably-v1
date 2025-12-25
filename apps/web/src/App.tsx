import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrders, type OrderLine } from "./stores/ordersStore";
import { apiCreateOrder, apiAddOrderLine, apiGetOrder, apiTransitionOrder, apiDeleteOrder, apiVoidOrder, apiParkOrder, apiCancelOrder, type OrderDTO, apiLinkCustomerToOrder, apiUpdateOrder } from "./api/pos/orders";
import { usePosSession } from "./stores/posSessionStore";
import LastReceiptTrigger from "./components/LastReceiptTrigger";
import { fetchActivePosMenu } from "./api/pos";
import type { PosMenuDTO } from "./types/pos";
import { useKds } from "./stores/kdsStore";
import { apiGetProductModifierGroups } from "./api/pos/modifiers";
import ModifierSheet from "./components/pos/ModifierSheet";
import CustomerRow from "./components/pos/CustomerRow";
import CustomerPanelOverlay from "./components/customers/CustomerPanelOverlay";
import MoreActionsSheet from "./components/ui/MoreActionsSheet";
import CustomerModal from "./components/pos/CustomerModal";
import { type DraftOrderContext } from "./components/pos/OrderContextChip";
import BoekenSheet from "./components/pos/BoekenSheet";
import { apiBookOrder } from "./api/pos/tables";
import { LogOut } from "lucide-react";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function categoryLabelFromItem(item: PosMenuDTO["items"][number]): string {
  return item.course?.shortLabel ?? item.course?.name ?? "Overig";
}


export function App() {
  const navigate = useNavigate();
  const location = useLocation();

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
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [bookingIntent, setBookingIntent] = useState(false);
  const [boekenOpen, setBoekenOpen] = useState(false);
  const [draftContext, setDraftContext] = useState<DraftOrderContext>({ orderType: "WALKIN" });
  const [activeOrder, setActiveOrder] = useState<OrderDTO | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [breakSubmitting, setBreakSubmitting] = useState(false);
  const [breakReason, setBreakReason] = useState("");
  const [breakLabel, setBreakLabel] = useState("");
  const { sentCount, refreshCounts } = useKds();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const totalCents = activeOrder ? activeOrder.totalInclVatCents : 0;
  const itemsCount = (activeOrder?.lines ?? []).reduce((s, l) => s + l.qty, 0);

  // last receipt is handled via LastReceiptTrigger component
  // Ensure initial fetch for badge at POS mount
  useEffect(() => {
    refreshCounts(true);
  }, []);

  function syncLocalStoreFromOrder(ord: OrderDTO) {
    try {
      setCurrentOrder(ord.id);
      clearCurrentOrder();
      const lines = ord.lines ?? [];
      for (const line of lines) {
        addLine(line.id, line.title, line.priceCents, line.qty);
      }
    } catch (e) {
      console.warn("syncLocalStoreFromOrder failed", e);
    }
  }

  // Sync local orders store whenever the active order changes
  useEffect(() => {
    if (activeOrder) {
      try {
        syncLocalStoreFromOrder(activeOrder);
      } catch (e) {
        console.warn("sync from effect failed", e);
      }
    }
  }, [activeOrder]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<{ id: string; name: string; priceCents: number } | null>(null);
  const [sheetMenuItemId, setSheetMenuItemId] = useState<string | null>(null);
  const [sheetGroups, setSheetGroups] = useState<Array<{ id: string; name: string; minSelect: number; maxSelect: number; options: { id: string; name: string; priceDeltaCents: number }[] }>>([]);
  const inflightCreateRef = useRef<Promise<string> | null>(null);

  async function ensureActiveOrderCreated(): Promise<string> {
    // Create a backend order only when needed, mirror locally
    const existing = activeOrderId;
    if (existing) return existing;
    const created = await apiCreateOrder();
    setActiveOrderId(created.id);
    setActiveOrder(created);
    syncLocalStoreFromOrder(created);
    return created.id;
  }

  async function ensureRealOrderIfNeeded(reason: string): Promise<string> {
    if (activeOrderId) return activeOrderId;
    if (inflightCreateRef.current) return inflightCreateRef.current;
    const p = (async () => {
      const id = await ensureActiveOrderCreated();
      try {
        if ((draftContext as any).tableId) {
          await apiBookOrder(id, { type: "TABLE", tableId: (draftContext as any).tableId });
        } else if (draftContext.orderType === "TAKEAWAY") {
          await apiUpdateOrder(id, { orderType: "TAKEAWAY" });
        }
      } catch {}
      return id;
    })();
    inflightCreateRef.current = p;
    const id = await p;
    inflightCreateRef.current = null;
    return id;
  }

  async function addItemToOrder(item: PosMenuDTO["items"][number]) {
    try {
      const pid = item.product.id; // product id
      // Prefer per-item modifier groups from active menu
      const embeddedGroups = (item as any).modifierGroups || [];
      if (embeddedGroups.length > 0) {
        // Defer order creation until confirm
        setSheetProduct({ id: pid, name: item.product.name, priceCents: item.priceCents });
        setSheetGroups(embeddedGroups);
        setSheetMenuItemId(item.id);
        setSheetOpen(true);
        return; // wait for confirm
      }
      // Fallback to product-level groups
      try {
        const resp = await apiGetProductModifierGroups(pid);
        const groups = resp.groups || [];
        if (groups.length > 0) {
          // Defer order creation until confirm
          setSheetProduct({ id: pid, name: item.product.name, priceCents: item.priceCents });
          setSheetGroups(groups);
          setSheetMenuItemId(null);
          setSheetOpen(true);
          return; // wait for confirm
        }
      } catch (_e) {
        // ignore; proceed to add without modifiers
      }
      // No modifiers: create on first tap if needed, then add
      const targetOrderId = await ensureRealOrderIfNeeded("LINE_ADDED");
      const updated = await apiAddOrderLine(targetOrderId, pid, 1, undefined, item.id);
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

  // Handle picker return via URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pickForOrder = params.get("pickForOrder");
    const pickedTableId = params.get("pickedTableId");
    const pickedCustomerId = params.get("pickedCustomerId");
    if (!pickForOrder || (!pickedTableId && !pickedCustomerId)) return;
    (async () => {
      const id = await ensureRealOrderIfNeeded(pickedTableId ? "BOOK_TABLE" : "BOOK_CUSTOMER");
      try {
        if (pickedTableId) {
          const currentTableId = (activeOrder as any)?.tableId || (activeOrder as any)?.table?.id || null;
          if (currentTableId !== pickedTableId) {
            const updated = await apiBookOrder(id, { type: "TABLE", tableId: pickedTableId });
            setActiveOrder(updated);
            syncLocalStoreFromOrder(updated);
          }
        }
        if (pickedCustomerId) {
          if (!activeOrder?.customer || activeOrder.customer.id !== pickedCustomerId) {
            const updated = await apiLinkCustomerToOrder(id, pickedCustomerId);
            setActiveOrder(updated);
            syncLocalStoreFromOrder(updated);
          }
        }
      } catch (e) {
        console.warn("persist booking failed", e);
      }
      // Clear any POS query params before navigating to order detail
      navigate("/pos", { replace: true });
      navigate(`/orders/${id}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const statusClass = loading ? "loading" : error ? "error" : "ready";
  const statusLabel = loading ? "Loading" : error ? "Error" : "Ready";
  function statusColor(cls: string): string {
    if (cls === "ready") return "#10b981"; // green
    if (cls === "loading") return "#f59e0b"; // amber
    if (cls === "error") return "#ef4444"; // red
    return "#9ca3af"; // fallback gray
  }
  const [pulseOn, setPulseOn] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setPulseOn((v) => !v), 1200);
    return () => clearInterval(t);
  }, []);
  const userName = (typeof window !== "undefined" && (window.localStorage.getItem("userName") || "Medewerker")) as string;

  return (
    <div className={`app light ${compact ? "compact" : ""}`}>
      <header className="topbar light">
        <div className="topbar-left">Tably POS</div>
        <div className="topbar-center">{menu?.name ?? "—"}</div>
        <div className="topbar-right" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#111827", fontWeight: 600 }}>{userName}</span>
          {/* Header context chip removed per spec */}
          <button
            className="btn"
            aria-label="Afmelden"
            title="Afmelden"
            onClick={() => { try { window.localStorage.clear(); } catch {} window.location.reload(); }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
          <span
            aria-label={statusLabel}
            title={statusLabel}
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: statusColor(statusClass),
              border: "1px solid #e5e7eb",
              display: "inline-block",
              boxShadow: statusClass === "ready" && pulseOn ? "0 0 0 6px rgba(16,185,129,0.12)" : "none",
              transition: "box-shadow 0.6s ease",
            }}
          />
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
            {/* CustomerRow above bon header (always visible) */}
            <CustomerRow customer={activeOrder?.customer} />
            <div className="bon-header">
              <div className="bon-header-top">
                {(() => {
                  const label = activeOrder?.receiptLabel || activeOrder?.draftLabel;
                  return label ? (
                    <div className="bon-title-number">Bon {label}</div>
                  ) : (
                    <div className="bon-title">Bon</div>
                  );
                })()}
                <div className="bon-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`status-chip ${statusClass}`}>{statusLabel}</span>
                </div>
              </div>

              {activeOrder && (
                <>
                  <div className="bon-total">
                    <div className="bon-total-label">Totaal</div>
                    <div className="bon-total-value">{formatEuro(totalCents)}</div>
                  </div>

                  <div className="bon-meta">
                    <div>
                      BTW: {activeOrder?.vatBreakdown
                        ? (() => {
                            const vals = Object.values(activeOrder.vatBreakdown || {});
                            if (!vals || vals.length === 0) return "—";
                            const parts = vals
                              .sort((a, b) => a.rateBps - b.rateBps)
                              .filter((b) => (b?.vatCents ?? 0) > 0)
                              .map((b) => `${(b.rateBps / 100).toFixed(0)}% ${formatEuro(b.vatCents)}`);
                            return parts.length > 0 ? parts.join(" • ") : formatEuro(0);
                          })()
                        : "—"}
                    </div>
                    <div>Subtotaal excl. btw: {activeOrder ? formatEuro(activeOrder.subtotalExclVatCents) : "—"}</div>
                    <div>Items: {itemsCount}</div>
                  </div>
                </>
              )}
            </div>

            <div className={`order-list ${!activeOrder || (activeOrder.lines ?? []).length === 0 ? "empty" : ""}`}>
              {!activeOrder ? (
                <div>Kies producten om te starten</div>
              ) : (activeOrder.lines ?? []).length === 0 ? (
                <div>Nog geen items</div>
              ) : (
                (activeOrder.lines ?? []).map((l) => (
                  <div key={l.id} className="order-line">
                    <div className="order-line-title">
                      {l.title}
                      {l.vatSource === "MENUITEM" && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          BTW (override)
                        </div>
                      )}
                    </div>
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
                {/* 2026: ultra-simple action bar */}
                {(() => {
                  const showBookAction = !!activeOrder && (((activeOrder as any)?.table) || !!activeOrder?.customer);
                  return (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn danger" onClick={() => setBreakOpen(true)}>Breek af</button>
                      {showBookAction && (
                        <button className="btn" onClick={() => setBoekenOpen(true)}>Boeken</button>
                      )}
                      <button
                        className="btn success"
                        onClick={() => activeOrderId && navigate("/checkout", { state: { orderId: activeOrderId } })}
                        disabled={!activeOrder || (activeOrder.lines ?? []).length === 0}
                      >
                        Uitchecken
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </aside>
        </div>
      </div>
      {breakOpen && (
        <div className="checkout-modal-overlay" onClick={() => !breakSubmitting && setBreakOpen(false)}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
            {(() => {
              const kind = (activeOrder as any)?.kind || "QUICK";
              const lines = activeOrder?.lines?.length || 0;
              if (kind === "QUICK" && lines === 0) {
                return (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ fontWeight: 800 }}>Lege bon verwijderen?</div>
                    <div className="order-row-meta">De lege quick-bon wordt verwijderd. Er wordt direct een nieuwe bon gestart.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => setBreakOpen(false)} disabled={breakSubmitting}>Annuleer</button>
                      <button className="btn danger" disabled={breakSubmitting} onClick={async () => {
                        if (!activeOrderId) return;
                        try {
                          setBreakSubmitting(true);
                          await apiDeleteOrder(activeOrderId);
                          const created = await apiCreateOrder();
                          setActiveOrderId(created.id);
                          setActiveOrder(created);
                        } catch (e) {
                          setToast("Verwijderen mislukt");
                        } finally {
                          setBreakSubmitting(false);
                          setBreakOpen(false);
                        }
                      }}>Verwijder en start nieuw</button>
                    </div>
                  </div>
                );
              }
              if (kind === "QUICK" && lines > 0) {
                return (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ fontWeight: 800 }}>Quick-bon afsluiten</div>
                    <div className="order-row-meta">Kies om weg te gooien of te parkeren als concept.</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <button className="btn danger" disabled={breakSubmitting} onClick={async () => {
                        if (!activeOrderId) return;
                        try {
                          setBreakSubmitting(true);
                          await apiVoidOrder(activeOrderId, breakReason || undefined);
                          const created = await apiCreateOrder();
                          setActiveOrderId(created.id);
                          setActiveOrder(created);
                        } catch (e) {
                          setToast("Weggooien mislukt");
                        } finally {
                          setBreakSubmitting(false);
                          setBreakOpen(false);
                          setBreakReason("");
                        }
                      }}>Weggooien</button>
                      <div style={{ display: "grid", gap: 6 }}>
                        <input className="orders-search" placeholder="Conceptlabel (optioneel)" value={breakLabel} onChange={(e) => setBreakLabel(e.target.value)} />
                        <button className="btn" disabled={breakSubmitting} onClick={async () => {
                          if (!activeOrderId) return;
                          try {
                            setBreakSubmitting(true);
                            await apiParkOrder(activeOrderId, breakLabel || undefined);
                            const created = await apiCreateOrder();
                            setActiveOrderId(created.id);
                            setActiveOrder(created);
                          } catch (e) {
                            setToast("Parkeren mislukt");
                          } finally {
                            setBreakSubmitting(false);
                            setBreakOpen(false);
                            setBreakLabel("");
                          }
                        }}>Parkeren als concept</button>
                      </div>
                      <button className="btn" onClick={() => setBreakOpen(false)} disabled={breakSubmitting}>Annuleer</button>
                    </div>
                  </div>
                );
              }
              // TRACKED flow
              return (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>Bestelling annuleren</div>
                  <input className="orders-search" placeholder="Reden (verplicht)" value={breakReason} onChange={(e) => setBreakReason(e.target.value)} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => setBreakOpen(false)} disabled={breakSubmitting}>Annuleer</button>
                    <button className="btn danger" disabled={breakSubmitting || breakReason.trim().length === 0} onClick={async () => {
                      if (!activeOrderId) return;
                      try {
                        setBreakSubmitting(true);
                        await apiCancelOrder(activeOrderId, breakReason.trim());
                        const created = await apiCreateOrder();
                        setActiveOrderId(created.id);
                        setActiveOrder(created);
                      } catch (e) {
                        setToast("Annuleren mislukt");
                      } finally {
                        setBreakSubmitting(false);
                        setBreakOpen(false);
                        setBreakReason("");
                      }
                    }}>Annuleer bestelling</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* POS Bottom Bar */}
      <div className="pos-bottombar">
        <button
          className="bar-btn"
          onClick={() => { clearActiveOrder(); setActiveOrder(null); }}
          disabled={!activeOrderId}
        >
          Hold
        </button>
        <button
          className="bar-btn"
          onClick={async () => {
            try {
              // discard empty unbooked OPEN orders when leaving POS
              if (
                activeOrderId &&
                activeOrder &&
                (activeOrder.lines?.length || 0) === 0 &&
                !(activeOrder as any).tableId && !(activeOrder as any).table &&
                !activeOrder.customer &&
                (activeOrder.status || "OPEN") === "OPEN"
              ) {
                await apiDeleteOrder(activeOrderId);
                clearActiveOrder();
                setActiveOrder(null);
                clearCurrentOrder();
              }
            } catch {}
            navigate("/orders");
          }}
        >
          Bestellingen
        </button>

        {/* Klant: pick for order when applicable */}
        <button
          className="bar-btn"
          onClick={async () => {
            const shouldPick = !!activeOrderId; // pick into active order if present
            if (shouldPick) {
              navigate(`/customers?pickForOrder=active&returnTo=/pos`);
              return;
            }
            // No active order: only go to pick mode if draft isn't an empty WALKIN
            const isEmptyWalkinDraft = !activeOrderId && draftContext.orderType === "WALKIN" && !(draftContext as any).tableId;
            if (isEmptyWalkinDraft) {
              // Normal mode
              try {
                if (
                  activeOrderId &&
                  activeOrder &&
                  (activeOrder.lines?.length || 0) === 0 &&
                  !(activeOrder as any).tableId && !(activeOrder as any).table &&
                  !activeOrder.customer &&
                  (activeOrder.status || "OPEN") === "OPEN"
                ) {
                  await apiDeleteOrder(activeOrderId);
                  clearActiveOrder();
                  setActiveOrder(null);
                  clearCurrentOrder();
                }
              } catch {}
              navigate("/customers");
            } else {
              navigate(`/customers?pickForOrder=draft&returnTo=/pos`);
            }
          }}
        >Klant</button>

        <LastReceiptTrigger variant="bottombar" />

        <button
          className="bar-btn"
          onClick={async () => {
            const shouldPick = !!activeOrderId;
            if (shouldPick) {
              navigate(`/tables?pickForOrder=active&returnTo=/pos`);
              return;
            }
            const isEmptyWalkinDraft = !activeOrderId && draftContext.orderType === "WALKIN" && !(draftContext as any).tableId;
            if (isEmptyWalkinDraft) {
              try {
                if (
                  activeOrderId &&
                  activeOrder &&
                  (activeOrder.lines?.length || 0) === 0 &&
                  !(activeOrder as any).tableId && !(activeOrder as any).table &&
                  !activeOrder.customer &&
                  (activeOrder.status || "OPEN") === "OPEN"
                ) {
                  await apiDeleteOrder(activeOrderId);
                  clearActiveOrder();
                  setActiveOrder(null);
                  clearCurrentOrder();
                }
              } catch {}
              navigate("/tables");
            } else {
              navigate(`/tables?pickForOrder=draft&returnTo=/pos`);
            }
          }}
        >
          Tafel
        </button>

        <button
          className="bar-btn"
          onClick={async () => {
            try {
              if (activeOrderId) {
                const updated = await apiUpdateOrder(activeOrderId, { orderType: "TAKEAWAY" });
                setActiveOrder(updated);
                navigate(`/orders/${activeOrderId}`);
                return;
              }
              setDraftContext((prev) => ({ ...prev, orderType: "TAKEAWAY" }));
            } catch {}
          }}
        >Afhaal</button>

        <button className="bar-btn" onClick={() => navigate("/kds")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            KDS
            {sentCount != null && sentCount > 0 && (
              <span style={{ fontSize: 12, lineHeight: 1, padding: "2px 6px", borderRadius: 999, background: "#111827", color: "#fff" }}>{sentCount}</span>
            )}
          </span>
        </button>

        <button className="bar-btn" onClick={() => setMoreOpen(true)}>Meer</button>
      </div>
  {/* More actions sheet */}
  <MoreActionsSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      {/* Modifiers bottom sheet */}
      {sheetProduct && (
        <ModifierSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          product={sheetProduct}
          groups={sheetGroups}
          onConfirm={async (selectedOptionIds) => {
            setSheetOpen(false);
            try {
              const targetOrderId = await ensureActiveOrderCreated();
              const updated = await apiAddOrderLine(targetOrderId, sheetProduct.id, 1, selectedOptionIds, sheetMenuItemId || undefined);
              setActiveOrder(updated);
              syncLocalStoreFromOrder(updated);
            } catch (e) {
              console.warn("add with modifiers failed", e);
            }
          }}
        />
      )}

      {/* Boeken bottom sheet */}
      <BoekenSheet
        open={boekenOpen}
        onClose={() => setBoekenOpen(false)}
        ensureRealOrderIfNeeded={ensureRealOrderIfNeeded}
        onSetDraftContext={(ctx) => setDraftContext((prev) => ({ ...prev, ...ctx }))}
      />

      {/* Handle picker return via URL params */}
      {/* Persist table/customer selection and navigate to Bon Detail */}
      {(() => {
        // useEffect cannot be placed inline; emulate by reading location.search inside component body is not ideal.
        // We'll attach a dedicated effect below.
        return null;
      })()}

      {/* Customer modal (still available for name booking via Customers hub) */}
      {activeOrderId && (
        <CustomerModal
          open={customerModalOpen}
          orderId={activeOrderId!}
          customer={activeOrder?.customer}
          onClose={() => setCustomerModalOpen(false)}
          onOrderUpdated={(updated) => {
            setActiveOrder(updated);
            syncLocalStoreFromOrder(updated);
            if (bookingIntent && updated?.id) {
              setBookingIntent(false);
              navigate(`/orders/${updated.id}`);
            }
          }}
        />
      )}

      {/* Fullscreen Customer Panel Overlay (SELECT + CARD) */}
      <CustomerPanelOverlay
        orderId={activeOrderId}
        activeOrderCustomer={activeOrder?.customer}
        onOrderUpdated={(ord) => {
          setActiveOrder((prev) => {
            const merged: OrderDTO = {
              ...(prev || ord),
              ...(ord as OrderDTO),
              customer: (ord as OrderDTO).customer ?? prev?.customer ?? null,
              lines: (ord as OrderDTO).lines ?? prev?.lines ?? [],
            } as OrderDTO;
            console.log("[App] activeOrder.customer after refresh:", merged?.customer);
            return merged;
          });
        }}
      />
    </div>
  );
}
