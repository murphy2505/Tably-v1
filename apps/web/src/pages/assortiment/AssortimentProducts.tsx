import { useEffect, useState } from "react";
import { apiListProducts, type Product } from "../../api/pos/products";

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    (cents ?? 0) / 100
  );
}

export default function AssortimentProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError(null);
        const list = await apiListProducts();
        if (!alive) return;
        setProducts(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!alive) return;
        setProducts([]);
        setError(e instanceof Error ? e.message : "Onbekende fout bij laden producten");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="page">
      <h1>Assortiment • Producten</h1>

      {loading && <p>Producten laden…</p>}

      {!loading && error && (
        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <strong>Kon producten niet laden</strong>
          <div style={{ marginTop: 6, opacity: 0.8 }}>{error}</div>
          <div style={{ marginTop: 10, fontFamily: "monospace", opacity: 0.8 }}>
            Verwacht endpoint: /pos-api/core/catalog/products
          </div>
        </div>
      )}

      {!loading && !error && products.length === 0 && <p>Nog geen producten aangemaakt.</p>}

      {!loading && !error && products.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Naam</th>
              <th align="left">Productgroep</th>
              <th align="left">Categorie</th>
              <th align="right">Prijs</th>
              <th align="center">Actief</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.productGroup?.name ?? "—"}</td>
                <td>{p.category?.name ?? "—"}</td>
                <td align="right">{euro(p.basePriceCents)}</td>
                <td align="center">{p.isActive ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
