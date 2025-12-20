import { useEffect, useState } from "react";
import { hwListPrinters, hwCreatePrinter, hwUpdatePrinter, hwDeletePrinter, hwTestPrinter, type HwPrinter, type Vendor } from "../../api/hardware";

function field<T>(v: T | undefined, d: T): T { return (v as any) ?? d; }

export default function HardwarePrintersPage() {
  const [items, setItems] = useState<HwPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HwPrinter | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<HwPrinter>>({ vendor: "GENERIC_ESCPOS", paperWidthMm: 80, isActive: true, port: 9100 } as any);

  useEffect(() => { let alive = true; (async () => {
    try {
      setLoading(true);
      const list = await hwListPrinters();
      if (alive) setItems(list);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  })(); return () => { alive = false; }; }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  function openNew() { setEditing(null); setForm({ name: "", vendor: "GENERIC_ESCPOS", host: "", port: 9100, paperWidthMm: 80, isActive: true } as any); setModalOpen(true); }
  function openEdit(p: HwPrinter) { setEditing(p); setForm(p); setModalOpen(true); }

  async function save() {
    try {
      if (!form.name || !form.vendor || !form.host) return;
      if (editing) {
        const updated = await hwUpdatePrinter(editing.id, form);
        setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x));
        setToast("Printer bijgewerkt");
      } else {
        const created = await hwCreatePrinter(form as any);
        setItems((prev) => [created, ...prev]);
        setToast("Printer toegevoegd");
      }
      setModalOpen(false);
    } catch (e: any) {
      setToast(e?.message || "Opslaan mislukt");
    }
  }

  async function onDelete(id: string) {
    try { await hwDeletePrinter(id); setItems((prev) => prev.filter((x) => x.id !== id)); setToast("Verwijderd"); }
    catch (e: any) { setToast(e?.message || "Verwijderen mislukt"); }
  }

  async function onTest(id: string) {
    try {
      setTestingId(id);
      await hwTestPrinter(id);
      setToast("Testbon geprint");
    } catch (e: any) {
      setToast(e?.message || "Print test mislukt");
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="settings-grid">
      {toast && <div className="toast-fixed">{toast}</div>}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">Printers (LAN)</div>
          <div className="settings-card-actions">
            <button className="btn" onClick={openNew}>Nieuwe printer</button>
          </div>
        </div>
        {loading ? (
          <div className="settings-note">Laden…</div>
        ) : error ? (
          <div className="settings-error">{error}</div>
        ) : (
          <table className="settings-table">
            <thead>
              <tr>
                <th>Naam</th><th>Host/IP</th><th>Poort</th><th>Vendor</th><th>Papier</th><th>Status</th><th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.host}</td>
                  <td>{p.port}</td>
                  <td>{p.vendor}</td>
                  <td>{p.paperWidthMm}</td>
                  <td>{p.isActive ? "Actief" : "Uit"}</td>
                  <td>
                    <button className="btn" onClick={() => openEdit(p)}>Bewerken</button>
                    <button className="btn" onClick={() => onTest(p.id)} disabled={testingId != null}>Test</button>
                    <button className="btn danger" onClick={() => onDelete(p.id)}>Verwijderen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="settings-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-form">
              <label>
                <span>Naam</span>
                <input value={field(form.name, "")} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label>
                <span>Host/IP</span>
                <input value={field(form.host, "")} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} />
              </label>
              <label>
                <span>Poort</span>
                <input type="number" value={field(form.port, 9100)} onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value || 9100) }))} />
              </label>
              <label>
                <span>Vendor</span>
                <select value={field(form.vendor as Vendor, "GENERIC_ESCPOS")} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value as Vendor }))}>
                  <option value="STAR">STAR</option>
                  <option value="EPSON">EPSON</option>
                  <option value="GENERIC_ESCPOS">GENERIC_ESCPOS</option>
                </select>
              </label>
              <label>
                <span>Papier</span>
                <select value={field(form.paperWidthMm as 58|80, 80)} onChange={(e) => setForm((f) => ({ ...f, paperWidthMm: Number(e.target.value) as any }))}>
                  <option value={80}>80</option>
                  <option value={58}>58</option>
                </select>
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={field(form.isActive, true)} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                <span>Actief</span>
              </label>
              <div className="settings-form-actions">
                <button className="btn" onClick={() => setModalOpen(false)}>Annuleer</button>
                <button className="btn primary" onClick={save}>Opslaan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
