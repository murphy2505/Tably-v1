import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMenu, addMenuItem, type MenuCard, type MenuCardItem } from "../api/admin/menuCards";
import { apiListProducts, type Product } from "../api/pos/products";

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format((cents ?? 0) / 100);
}

export default function AssortimentMenuDetail() {
  const { menuId } = useParams();
  const [menu, setMenu] = useState<MenuCard | null>(null);
  const [items, setItems] = useState<MenuCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        if (!menuId) throw new Error("menuId ontbreekt in route");
        const [m, p] = await Promise.all([getMenu(menuId), apiListProducts()]);
        if (!alive) return;
        setMenu(m);
        setItems((m.items || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        setProducts(Array.isArray(p) ? p : []);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Kon menu niet laden");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [menuId]);

  async function handleAddItem() {
    if (!menuId || !selectedProductId) return;
    try {
      setAdding(true);
      const created = await addMenuItem(menuId, selectedProductId, sortOrder || 0);
      setItems((prev) => {
        const next = prev.concat(created);
        next.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        return next;
      });
      setSelectedProductId("");
      setSortOrder(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon item niet toevoegen");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="page">
      <h1>Menukaart • {menu?.name ?? "laden…"}</h1>

      {loading && <p>Menu laden…</p>}
      {!loading && error && (
        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <strong>Fout</strong>
          <div style={{ marginTop: 6, opacity: 0.8 }}>{error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ marginBottom: 16 }}>
            <strong>Items</strong>
            {items.length === 0 && <p style={{ marginTop: 8 }}>Nog geen items.</p>}
            {items.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr>
                    <th align="left">Sort</th>
                    <th align="left">Product</th>
                    <th align="left">Categorie</th>
                    <th align="right">Prijs</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.sortOrder ?? 0}</td>
                      <td>{it.product?.name ?? "—"}</td>
                      <td>{it.product?.category?.name ?? "—"}</td>
                      <td align="right">{euro(it.product?.basePriceCents ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
            <strong>Item toevoegen</strong>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
              <label>
                Product:
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} style={{ marginLeft: 8 }}>
                  <option value="">— selecteer —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Sort:
                <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} style={{ marginLeft: 8, width: 80 }} />
              </label>
              <button disabled={adding || !selectedProductId} onClick={handleAddItem}>Toevoegen</button>
            </div>
            <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>MVP: alleen product + sortorder. Geen modifiers of BTW override.</div>
          </div>
        </>
      )}
    </div>
  );
}
