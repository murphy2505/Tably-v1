import { useEffect, useState } from "react";
import { listMenus, type MenuCard } from "../api/admin/menuCards";
import { useNavigate } from "react-router-dom";

export default function AssortimentMenus() {
  const [menus, setMenus] = useState<(MenuCard & { itemsCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        const data = await listMenus();
        if (!alive) return;
        setMenus(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Kon menukaarten niet laden");
        setMenus([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="page">
      <h1>Assortiment • Menukaarten</h1>

      {loading && <p>Menukaarten laden…</p>}

      {!loading && error && (
        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
          <strong>Kon menukaarten niet laden</strong>
          <div style={{ marginTop: 6, opacity: 0.8 }}>{error}</div>
          <div style={{ marginTop: 10, fontFamily: "monospace", opacity: 0.8 }}>
            Verwacht endpoint: /pos-api/core/menu-cards
          </div>
        </div>
      )}

      {!loading && !error && menus.length === 0 && (
        <p>Nog geen menukaarten aangemaakt.</p>
      )}

      {!loading && !error && menus.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Naam</th>
              <th align="left">Kanaal</th>
              <th align="center">Actief</th>
              <th align="right">Items</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {menus.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.channel}</td>
                <td align="center">{m.isActive ? "✓" : "—"}</td>
                <td align="right">{m.itemsCount}</td>
                <td align="right">
                  <button onClick={() => navigate(`/assortiment/menus/${m.id}`)}>Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
