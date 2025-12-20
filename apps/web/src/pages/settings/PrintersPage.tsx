import { useEffect, useRef, useState } from "react";
import { createPrinter, deletePrinter, listPrinters, PrinterDTO, updatePrinter, testPrint } from "../../api/settings";

function field<T>(v: T | undefined, d: T): T { return (v as any) ?? d; }
type PrinterDriver = PrinterDTO["driver"];

export default function PrintersPage() {
  const [items, setItems] = useState<PrinterDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrinterDTO | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PrinterDTO | null>(null);

  // Local print settings (persisted in localStorage)
  type PrintSettings = { useLocalPrintService: boolean; printServiceUrl: string };
  const defaultHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const defaultSettings: PrintSettings = { useLocalPrintService: true, printServiceUrl: `http://${defaultHost}:4010` };
  const settingsKey = "tablyPrintSettingsV1";
  const loadSettings = (): PrintSettings => {
    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return defaultSettings;
      const parsed = JSON.parse(raw);
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
      let url = typeof parsed.printServiceUrl === "string" && parsed.printServiceUrl ? parsed.printServiceUrl : `http://${currentHost}:4010`;
      // Migrate old localhost default when accessed from LAN/iPad
      if (/^http:\/\/localhost:4010$/i.test(url) && currentHost !== "localhost") {
        url = `http://${currentHost}:4010`;
      }
      return {
        useLocalPrintService: typeof parsed.useLocalPrintService === "boolean" ? parsed.useLocalPrintService : true,
        printServiceUrl: url,
      };
    } catch {
      return defaultSettings;
    }
  };
  const [printSettings, setPrintSettings] = useState<PrintSettings>(loadSettings());
  useEffect(() => { try { localStorage.setItem(settingsKey, JSON.stringify(printSettings)); } catch { /* ignore */ } }, [printSettings]);
  const [serviceStatus, setServiceStatus] = useState<"unknown" | "online" | "offline">("unknown");

  const [form, setForm] = useState<Partial<PrinterDTO>>({ driver: "ESC_POS_TCP", paperWidth: 80, isActive: true, port: 9100 });

  useEffect(() => { let alive = true; (async () => {
    try { setLoading(true); const list = await listPrinters(); if (alive) setItems(list); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  })(); return () => { alive = false; }; }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  function openNew() { setEditing(null); setForm({ name: "", driver: "ESC_POS_TCP", host: "", port: 9100, paperWidth: 80, isActive: true }); setModalOpen(true); }
  function openEdit(p: PrinterDTO) { setEditing(p); setForm(p); setModalOpen(true); }

  async function pingService(showToast = false) {
    try {
      const base = printSettings.printServiceUrl.replace(/\/$/, "");
      const res = await fetch(`${base}/health`);
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && data?.ok === true;
      setServiceStatus(ok ? "online" : "offline");
      if (showToast) setToast(ok ? "Service online" : "Service offline");
    } catch {
      setServiceStatus("offline");
      if (showToast) setToast("Service offline");
    }
  }

  async function save() {
    try {
      if (!form.name || !form.driver || !form.host) return;
      if (editing) {
        const updated = await updatePrinter(editing.id, form);
        setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x));
        setToast("Printer bijgewerkt");
      } else {
        const created = await createPrinter(form as any);
        setItems((prev) => [created, ...prev]);
        setToast("Printer toegevoegd");
      }
      setModalOpen(false);
    } catch (e: any) {
      setToast(e?.message || "Opslaan mislukt");
    }
  }

  async function onDeleteConfirm() {
    if (!confirmDelete) return;
    try {
      await deletePrinter(confirmDelete.id);
      setItems((prev) => prev.filter((x) => x.id !== confirmDelete.id));
      setToast("Verwijderd");
    } catch (e: any) {
      setToast(e?.message || "Verwijderen mislukt");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function onTest(
    host?: string,
    port?: number,
    driver: "ESC_POS_TCP" | "STAR_ESC_POS_TCP" | "STARPRNT" | "EPOS_HTTP" = "ESC_POS_TCP"
  ) {
    try {
      // Guard: Star ESC/POS only supported via local print service
      if (driver === "STAR_ESC_POS_TCP" && !printSettings.useLocalPrintService) {
        setToast("Star ESC/POS testen kan alleen via de lokale printservice");
        return;
      }
      setTestingId(host ? `${host}:${port ?? 9100}` : "fallback");
      if (printSettings.useLocalPrintService) {
        const url = `${printSettings.printServiceUrl.replace(/\/$/, "")}/print/test`;
        // Debug payload to ensure identical to working curl
        const payload = { printer: { driver, host, port: port ?? 9100 } };
        console.log("PRINT TEST PAYLOAD", payload);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) throw new Error(data?.error || `LOCAL_SERVICE_ERROR_${res.status}`);
        setToast("Testbon geprint via lokale service");
      } else {
        await testPrint({ host, port });
        setToast("Testbon geprint via backend");
      }
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : String(e);
      if (/PRINTER_TIMEOUT|timeout/i.test(msg)) {
        setToast("Printer timeout (3s) — controleer IP/poort/protocol");
      } else {
        setToast(`Print test mislukt: ${msg}`);
      }
    } finally {
      setTestingId(null);
    }
  }

  // Auto-ping on mount and when settings change (debounced)
  useEffect(() => {
    if (printSettings.useLocalPrintService) {
      void pingService(false);
    } else {
      setServiceStatus("unknown");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!printSettings.useLocalPrintService) {
      setServiceStatus("unknown");
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { void pingService(false); }, 500);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [printSettings.useLocalPrintService, printSettings.printServiceUrl]);

  return (
    <div className="settings-grid">
                        
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">Printers</div>
          <div className="settings-card-actions">
            <button className="btn" onClick={openNew}>Nieuwe printer</button>
          </div>
        </div>
        {loading ? (
          <div className="settings-note">Laden…</div>
        ) : error ? (
          <div className="settings-error">{error}</div>
        ) : (
          <>
          <div className="settings-note" style={{ marginBottom: 12 }}>
            <label className="toggle-row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={printSettings.useLocalPrintService}
                onChange={(e) => setPrintSettings((s) => ({ ...s, useLocalPrintService: e.target.checked }))}
              />
              <span>Gebruik lokale print service</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto auto", gap: 8, alignItems: "center", marginTop: 8 }}>
              <div>Service URL</div>
              <input
                placeholder="http://localhost:4010"
                value={printSettings.printServiceUrl}
                onChange={(e) => setPrintSettings((s) => ({ ...s, printServiceUrl: e.target.value }))}
              />
              <button className="btn" onClick={() => pingService(true)}>Test service</button>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 8,
                  fontSize: 12,
                  background: serviceStatus === "online" ? "#d1fae5" : serviceStatus === "offline" ? "#fee2e2" : "#f3f4f6",
                  color: serviceStatus === "online" ? "#065f46" : serviceStatus === "offline" ? "#991b1b" : "#374151",
                }}
                title={serviceStatus === "unknown" ? "Onbekend" : serviceStatus === "online" ? "Online" : "Offline"}
              >
                {serviceStatus === "unknown" ? "—" : serviceStatus === "online" ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          <table className="settings-table">
            <thead>
              <tr>
                <th>Naam</th><th>Driver</th><th>Host/IP</th><th>Poort</th><th>Status</th><th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <>
                  <tr>
                    <td>Balie Epson TM-T20II</td>
                    <td>ESC_POS_TCP</td>
                    <td>192.168.2.168</td>
                    <td>9100</td>
                    <td>—</td>
                    <td>
                      <button className="btn" onClick={() => onTest("192.168.2.168", 9100, "ESC_POS_TCP")} disabled={testingId != null}>Test</button>
                    </td>
                  </tr>
                  <tr>
                    <td>Star TSP143</td>
                    <td>STAR_ESC_POS_TCP</td>
                    <td>192.168.2.13</td>
                    <td>9100</td>
                    <td>—</td>
                    <td>
                      <button className="btn" onClick={() => onTest("192.168.2.13", 9100, "STAR_ESC_POS_TCP")} disabled={testingId != null}>Test</button>
                    </td>
                  </tr>
                </>
              )}
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.driver}</td>
                  <td>{p.host}</td>
                  <td>{p.port}</td>
                  <td>{p.isActive ? "Actief" : "Uit"}</td>
                  <td>
                    <button className="btn" onClick={() => openEdit(p)}>Bewerken</button>
                    <button
                      className="btn"
                      onClick={() => onTest(p.host, p.port ?? 9100, p.driver)}
                      disabled={testingId != null || (p.driver !== "ESC_POS_TCP" && p.driver !== "STAR_ESC_POS_TCP")}
                      title={p.driver === "STARPRNT" ? "StarPRNT support komt later" : undefined}
                    >
                      Test
                    </button>
                    <button className="btn danger" onClick={() => setConfirmDelete(p)}>Verwijderen</button>
                    <div style={{ marginTop: 6 }}>
                      <select
                        value={p.driver}
                        onChange={async (e) => {
                          const nextDriver = e.target.value as PrinterDriver;
                          // Update local state immediately
                          setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, driver: nextDriver } : x)));
                          // Persist to backend
                          try {
                            const updated = await updatePrinter(p.id, { driver: nextDriver });
                            setItems((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
                          } catch (err: any) {
                            setToast(err?.message || "Driver wijzigen mislukt");
                          }
                        }}
                      >
                        <option value="ESC_POS_TCP">ESC/POS TCP (Epson / generiek)</option>
                        <option value="STAR_ESC_POS_TCP">ESC/POS TCP (Star compat)</option>
                        <option value="STARPRNT" disabled>StarPRNT (later)</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
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
                <span>Driver</span>
                <select value={field(form.driver, "ESC_POS_TCP")} onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value as any }))}>
                  <option value="ESC_POS_TCP">ESC/POS TCP (Epson)</option>
                  <option value="STAR_ESC_POS_TCP">ESC/POS TCP (Star compat)</option>
                  <option value="STARPRNT">StarPRNT (later)</option>
                </select>
              </label>
              <label>
                <span>Host</span>
                <input value={field(form.host, "")} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} />
              </label>
              <label>
                <span>Poort</span>
                <input type="number" value={field(form.port, 9100)} onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value || 9100) }))} />
              </label>
              <label>
                <span>Papierbreedte</span>
                <select value={field(form.paperWidth, 80)} onChange={(e) => setForm((f) => ({ ...f, paperWidth: Number(e.target.value) as any }))}>
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
              <div className="settings-note">Test werkt voor ESC/POS TCP. StarPRNT support komt later.</div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="settings-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-form" style={{ gridTemplateColumns: "1fr" }}>
              <div className="settings-card-title">Verwijderen bevestigen</div>
              <div className="settings-note">Weet je zeker dat je "{confirmDelete.name}" wilt verwijderen?</div>
              <div className="settings-form-actions">
                <button className="btn" onClick={() => setConfirmDelete(null)}>Annuleer</button>
                <button className="btn danger" onClick={onDeleteConfirm}>Verwijder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
