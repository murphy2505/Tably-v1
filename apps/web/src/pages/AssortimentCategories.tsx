import { useEffect, useState } from "react";
import { apiListCategories, type CategoryDTO } from "../api/pos/categories";

export default function AssortimentCategories() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setError(null);
        const list = await apiListCategories();
        if (!alive) return;
        setCategories(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!alive) return;
        setCategories([]);
        setError(e instanceof Error ? e.message : "Onbekende fout bij laden categorieën");
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
      <h1>Assortiment • Categorieën</h1>

      {loading && <p>Categorieën laden…</p>}

      {!loading && error && (
        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <strong>Kon categorieën niet laden</strong>
          <div style={{ marginTop: 6, opacity: 0.8 }}>{error}</div>
          <div style={{ marginTop: 10, fontFamily: "monospace", opacity: 0.8 }}>
            Verwacht endpoint: /pos-api/core/catalog/categories
          </div>
        </div>
      )}

      {!loading && !error && categories.length === 0 && <p>Nog geen categorieën.</p>}

      {!loading && !error && categories.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Naam</th>
              <th align="right">Sort</th>
              <th align="center">Actief</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td align="right">{c.sortOrder ?? 0}</td>
                <td align="center">{c.isActive ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
