import { useEffect, useState } from "react";
import { getPosSettings, updatePosSettings } from "../api/settings";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await getPosSettings();
        if (!alive) return;
        setAutoPrint(s.autoPrintReceiptAfterPayment);
      } catch (e: any) {
        setError(e?.message || "Kon instellingen niet laden");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function onToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setAutoPrint(next);
    try {
      const s = await updatePosSettings({ autoPrintReceiptAfterPayment: next });
      setAutoPrint(s.autoPrintReceiptAfterPayment);
      setSaved("Opgeslagen");
      setTimeout(() => setSaved(null), 2000);
    } catch (e: any) {
      setError(e?.message || "Opslaan mislukt");
    }
  }

  return (
    <div className="page settings-page">
      {saved && (
        <div style={{ position: "fixed", right: 16, bottom: 16, background: "#111827", color: "white", padding: "10px 14px", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,0.25)", zIndex: 1001 }}>
          {saved}
        </div>
      )}
      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">Bon & Print</div>
          </div>
          {loading && <div className="settings-note">Laden…</div>}
          {error && <div className="settings-error">{error}</div>}
          {!loading && !error && (
            <div className="settings-form" style={{ gridTemplateColumns: "1fr" }}>
              <label className="settings-input">
                <span>Bon automatisch printen na betaling</span>
                <input type="checkbox" checked={autoPrint} onChange={onToggle} />
              </label>
              <div className="settings-note">Bij afronden van betaling wordt de bon direct geprint op de Bonprinter (route RECEIPT).</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
