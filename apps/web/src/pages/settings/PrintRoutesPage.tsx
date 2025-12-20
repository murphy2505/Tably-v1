import { useEffect, useMemo, useState } from "react";
import { hwGetRoutes, hwPutRoutes, hwListPrinters, type HwPrinter, type PrintRouteDTO, type PrintKind } from "../../api/hardware";

function kindLabel(k: PrintKind) {
  switch (k) {
    case "RECEIPT": return "Bonprinter";
    case "QR_CARD": return "QR / klantenkaart";
    case "KITCHEN": return "Keuken";
    case "BAR": return "Bar";
    default: return k;
  }
}

export default function PrintRoutesPage() {
  const [printers, setPrinters] = useState<HwPrinter[]>([]);
  const [routes, setRoutes] = useState<PrintRouteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const kinds: PrintKind[] = ["RECEIPT", "QR_CARD", "KITCHEN", "BAR"];

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  useEffect(() => { let alive = true; (async () => {
    try {
      setLoading(true);
      const [ps, rs] = await Promise.all([hwListPrinters(), hwGetRoutes()]);
      if (!alive) return;
      setPrinters(ps.filter(p => p.isActive));
      setRoutes(rs);
    } catch (e: any) {
      setToast(e?.message || "Laden mislukt");
    } finally {
      setLoading(false);
    }
  })(); return () => { alive = false; }; }, []);

  const byKind = useMemo(() => new Map(routes.map(r => [r.kind, r])), [routes]);

  async function save() {
    try {
      setSaving(true);
      const payload = kinds
        .map(k => ({ kind: k, printerId: byKind.get(k)?.printerId, isDefault: k === "RECEIPT" }))
        .filter(r => r.printerId);
      const result = await hwPutRoutes(payload as any);
      setRoutes(result);
      setToast("Print routes opgeslagen");
    } catch (e: any) {
      setToast(e?.message || "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-grid">
      {toast && <div className="toast-fixed">{toast}</div>}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">Print routes</div>
          <div className="settings-card-actions">
            <button className="btn primary" disabled={saving || loading} onClick={save}>Opslaan</button>
          </div>
        </div>
        {loading ? (
          <div className="settings-note">Laden…</div>
        ) : (
          <div className="settings-form" style={{gridTemplateColumns: "200px 1fr"}}>
            {kinds.map((k) => (
              <label key={k}>
                <span>{kindLabel(k)}</span>
                <select
                  disabled={printers.length === 0}
                  value={byKind.get(k)?.printerId || ""}
                  onChange={(e) => {
                  const id = e.target.value;
                  setRoutes((prev) => {
                    const next = prev.filter(r => r.kind !== k);
                    next.push({ id: byKind.get(k)?.id || `temp-${k}`, kind: k, printerId: id, isDefault: k === "RECEIPT" });
                    return next;
                  });
                }}
                >
                  <option value="">Niet ingesteld</option>
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>{`${p.name} — ${p.host}:${p.port} (${p.vendor})`}</option>
                  ))}
                </select>
              </label>
            ))}
            {printers.length === 0 && (
              <div className="settings-note">Geen actieve printers geconfigureerd</div>
            )}
            <div className="settings-note">iPad print via backend; printers moeten LAN bereikbaar zijn.</div>
          </div>
        )}
      </div>
    </div>
  );
}
