import { useEffect, useState } from "react";
import { apiGetWebshopStatus, type WebshopStatus } from "../api/webshop/status";

export default function WebshopStatusDemo() {
  const [status, setStatus] = useState<WebshopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGetWebshopStatus()
      .then((s) => { setStatus(s); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Webshop Status</h2>
      {loading && <div>Loading…</div>}
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      {status && (
        <div>
          <div>Open: {status.isOpen ? "JA" : "NEE"}</div>
          {!status.isOpen && (
            <div style={{ color: "#6b7280" }}>
              {status.reason || "GESLOTEN"}
              {status.nextOpenAt && <div>Opent: {new Date(status.nextOpenAt).toLocaleString()}</div>}
              {status.note && <div>Opmerking: {status.note}</div>}
            </div>
          )}
          <button className="btn" disabled={!status.isOpen}>Bestel</button>
        </div>
      )}
    </div>
  );
}
