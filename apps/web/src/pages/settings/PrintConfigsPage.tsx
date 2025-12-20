import { useEffect, useState } from "react";
import { PrintConfigDTO, createPrintConfig, deletePrintConfig, listPrintConfigs, updatePrintConfig, PrinterDTO, listPrinters } from "../../api/settings";

function field<T>(v: T | undefined, d: T): T { return (v as any) ?? d; }

export default function PrintConfigsPage() {
  const [items, setItems] = useState<PrintConfigDTO[]>([]);
  const [printers, setPrinters] = useState<PrinterDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrintConfigDTO | null>(null);

  const [form, setForm] = useState<Omit<PrintConfigDTO, "id" | "createdAt" | "updatedAt">>({
    name: "",
    template: "CUSTOMER_RECEIPT",
    plan: "MANUAL",
    targetPrinters: [],
    channels: [],
    areas: [],
    prepStations: [],
    ignoreLinesWithoutPrepStation: false,
    isActive: true,
  });

  useEffect(() => { let alive = true; (async () => {
    try {
      setLoading(true);
      const [cfgs, prns] = await Promise.all([listPrintConfigs(), listPrinters()]);
      if (!alive) return;
      setItems(cfgs);
      setPrinters(prns);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  })(); return () => { alive = false; }; }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  function openNew() { setEditing(null); setForm({ ...form, name: "" }); setModalOpen(true); }
  function openEdit(c: PrintConfigDTO) { setEditing(c); setForm({ ...c }); setModalOpen(true); }

  async function save() {
    try {
      if (!form.name) return;
      if (editing) {
        const updated = await updatePrintConfig(editing.id, form);
        setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x));
        setToast("Config bijgewerkt");
      } else {
        const created = await createPrintConfig(form);
        setItems((prev) => [created, ...prev]);
        setToast("Config toegevoegd");
      }
      setModalOpen(false);
    } catch (e: any) {
      setToast(e?.message || "Opslaan mislukt");
    }
  }

  async function onDelete(id: string) {
    try { await deletePrintConfig(id); setItems((prev) => prev.filter((x) => x.id !== id)); setToast("Verwijderd"); }
    catch (e: any) { setToast(e?.message || "Verwijderen mislukt"); }
  }

  return (
    <div className="settings-grid">
      {toast && <div className="toast-fixed">{toast}</div>}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">Print configuraties</div>
          <div className="settings-card-actions">
            <button className="btn" onClick={openNew}>Nieuwe configuratie</button>
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
                <th>Naam</th><th>Template</th><th>Printplan</th><th>Printers</th><th>Status</th><th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.template}</td>
                  <td>{c.plan}</td>
                  <td>{c.targetPrinters.map((id) => printers.find((p) => p.id === id)?.name || id).join(", ") || "—"}</td>
                  <td>{c.isActive ? "Actief" : "Uit"}</td>
                  <td>
                    <button className="btn" onClick={() => openEdit(c)}>Bewerken</button>
                    <button className="btn danger" onClick={() => onDelete(c.id)}>Verwijderen</button>
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
            <div className="settings-form settings-form-grid">
              <label>
                <span>Naam</span>
                <input value={field(form.name, "")} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label>
                <span>Template</span>
                <select value={field(form.template, "CUSTOMER_RECEIPT")} onChange={(e) => setForm((f) => ({ ...f, template: e.target.value as any }))}>
                  <option value="CUSTOMER_RECEIPT">Klantbon</option>
                  <option value="KITCHEN_TICKET">Keuken</option>
                  <option value="QR_CARD">QR kaart</option>
                </select>
              </label>
              <label>
                <span>Printplan</span>
                <select value={field(form.plan, "MANUAL")} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as any }))}>
                  <option value="NEVER">Nooit</option>
                  <option value="ON_PAY">Bij betaling</option>
                  <option value="ON_SEND_TO_KDS">Bij KDS</option>
                  <option value="MANUAL">Handmatig</option>
                </select>
              </label>
              <label>
                <span>Printers</span>
                <select multiple value={field(form.targetPrinters, [])} onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setForm((f) => ({ ...f, targetPrinters: opts }));
                }}>
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Channels</span>
                <select multiple value={field(form.channels, [])} onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value as any);
                  setForm((f) => ({ ...f, channels: opts }));
                }}>
                  {(["POS","WEB","TAKEAWAY","DELIVERY"] as const).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={field(form.ignoreLinesWithoutPrepStation, false)} onChange={(e) => setForm((f) => ({ ...f, ignoreLinesWithoutPrepStation: e.target.checked }))} />
                <span>Regels zonder station overslaan</span>
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
            <div className="preview-pane">
              <div className="preview-title">Voorbeeld</div>
              <div className="preview-note">Placeholder voor bon- en ticketopmaak. Voor targeted printing per config komt later.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
