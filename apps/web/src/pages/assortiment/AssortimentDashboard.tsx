import React, { useEffect, useMemo, useState } from "react";
import StatCard from "../../components/loyalty/StatCard";
import ProductCard from "../../components/assortiment/ProductCard";
import CategoryCard from "../../components/assortiment/CategoryCard";
import ProductDetailOverlay from "../../components/products/ProductDetailOverlay";
import { apiListProducts, type Product } from "../../api/pos/products";
import { apiListCategories, type CategoryDTO } from "../../api/pos/categories";
import { listMenus, type MenuCard } from "../../api/admin/menuCards";
import { useNavigate } from "react-router-dom";

export default function AssortimentDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [menus, setMenus] = useState<MenuCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [p, c] = await Promise.all([
          apiListProducts(),
          apiListCategories(),
        ]);
        const m = await listMenus().catch(() => []);
        if (!alive) return;
        setProducts(p || []);
        setCategories(c || []);
        setMenus(Array.isArray(m) ? m : []);
      } catch (e) {
        if (!alive) return;
        setError("Kon assortiment niet laden");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const kpis = useMemo(() => {
    const totaal = products.length;
    const actief = products.filter((p) => p.isActive).length;
    const lageVoorraad = 0; // mock
    const inWebshop = Math.round(products.length * 0.4); // mock
    return { totaal, actief, lageVoorraad, inWebshop };
  }, [products]);

  const byCategoryCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const name = p.category?.name || "—";
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const map: Record<string, number> = {};
    counts.forEach((v, k) => { map[k] = v; });
    return map;
  }, [products]);

  return (
    <div className="page" style={{ padding: 16, background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Assortiment</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => navigate("/assortiment/products")}>Nieuw product</button>
          <button className="btn" onClick={() => navigate("/assortiment/categories")}>Categorieën</button>
          <button className="btn" onClick={() => navigate("/assortiment/menus")}>Menukaarten</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard title="Totaal producten" value={kpis.totaal} />
        <StatCard title="Actieve producten" value={kpis.actief} />
        <StatCard title="Uitverkocht / lage voorraad" value={kpis.lageVoorraad} />
        <StatCard title="Producten in webshop" value={kpis.inWebshop} />
      </div>

      {/* Main content: 2 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Productoverzicht</div>
            {loading && <div>Bezig met laden…</div>}
            {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
            {!loading && !error && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onOpen={(pp) => { setSelected(pp); setOverlayOpen(true); }} />
                ))}
                {products.length === 0 && (
                  <div style={{ color: "#6b7280" }}>Geen producten gevonden.</div>
                )}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Menukaarten overzicht</div>
            <div style={{ display: "grid", gap: 8 }}>
              {menus.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ color: "#374151" }}>{m.name}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: m.isActive ? "#10b981" : "#9ca3af", color: "white" }}>{m.isActive ? "Actief" : "Inactief"}</span>
                    <button className="btn" onClick={() => navigate(`/assortiment/menus/${m.id}`)}>Bewerk</button>
                  </div>
                </div>
              ))}
              {menus.length === 0 && (
                <div style={{ color: "#6b7280" }}>Nog geen menukaarten.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Categorieën overzicht</div>
            <div style={{ display: "grid", gap: 8 }}>
              {categories.map((c) => (
                <CategoryCard key={c.id} category={{ ...c, productsCount: byCategoryCount[c.name] || 0 }} />
              ))}
              {categories.length === 0 && (
                <div style={{ color: "#6b7280" }}>Nog geen categorieën.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      <ProductDetailOverlay product={selected} open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </div>
  );
}
