import { useMemo, useState } from "react";
import { Plus, Pencil, Power } from "lucide-react";

type RevenueGroup = {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
  note?: string;
};

const seed: RevenueGroup[] = [
  { id: "rg-friet", name: "Friet", code: "FRI", isActive: true },
  { id: "rg-snacks", name: "Snacks", code: "SNK", isActive: true },
  { id: "rg-drank", name: "Dranken", code: "DRK", isActive: true },
  { id: "rg-ijs", name: "IJs", code: "IJS", isActive: true },
  { id: "rg-overig", name: "Overig", code: "OVR", isActive: true },
];

export default function AssortimentRevenueGroups() {
  const [groups, setGroups] = useState<RevenueGroup[]>(seed);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const editTarget = useMemo(() => groups.find((g) => g.id === editId) ?? null, [groups, editId]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditId(null);
    setName("");
    setCode("");
    setNote("");
    setIsActive(true);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(g: RevenueGroup) {
    setEditId(g.id);
    setName(g.name);
    setCode(g.code ?? "");
    setNote(g.note ?? "");
    setIsActive(g.isActive);
    setError(null);
    setModalOpen(true);
  }

  function save() {
    const n = name.trim();
    if (!n) {
      setError("Naam is verplicht");
      return;
    }
    if (editId) {
      setGroups((prev) => prev.map((g) => (g.id === editId ? { ...g, name: n, code: code || undefined, note: note || undefined, isActive } : g)));
    } else {
      const id = `rg-${Date.now()}`;
      setGroups((prev) => [{ id, name: n, code: code || undefined, note: note || undefined, isActive }, ...prev]);
    }
    setModalOpen(false);
  }

  function toggleActive(id: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, isActive: !g.isActive } : g)));
  }

  const empty = groups.length === 0;

  return (
    <div className="rg-page">
      {/* Header */}
      <div className="rg-header">
        <div className="rg-titles">
          <h1>Omzetgroepen</h1>
          <p className="rg-subtitle">
            Omzetgroepen bepalen je rapportage en (later) boekhouding. Koppel producten hieraan voor nette dagtotalen en BTW-overzichten.
          </p>
        </div>
        <div className="rg-actions">
          <button className="btn primary" onClick={openAdd}>
            <Plus size={16} />
            <span>Omzetgroep toevoegen</span>
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="rg-cards">
        <div className="rg-card">
          <div className="rg-card-title">Waarom?</div>
          <div className="rg-card-body">Gebruik omzetgroepen om je verkoop te groeperen voor rapportage en inzicht.</div>
        </div>
        <div className="rg-card">
          <div className="rg-card-title">Tip</div>
          <div className="rg-card-body">Maak groepen zoals Friet, Snacks, Dranken, IJs.</div>
        </div>
        <div className="rg-card">
          <div className="rg-card-title">BTW</div>
          <div className="rg-card-body">Je kiest later per omzetgroep een standaard BTW (9%/21%).</div>
        </div>
      </div>

      {/* Table / list */}
      {empty ? (
        <div className="rg-empty">
          <div className="rg-card">
            <div className="rg-card-title">Nog geen omzetgroepen</div>
            <div className="rg-card-body">Begin met je eerste omzetgroep voor betere rapportage.</div>
            <button className="btn primary" onClick={openAdd}>
              <Plus size={16} /> Maak je eerste omzetgroep
            </button>
          </div>
        </div>
      ) : (
        <div className="rg-table">
          <div className="rg-row rg-head">
            <div>Naam</div>
            <div>Code</div>
            <div>Status</div>
            <div>Acties</div>
          </div>
          {groups.map((g) => (
            <div className="rg-row" key={g.id}>
              <div className="rg-cell-name">
                <div className="rg-name">{g.name}</div>
                {g.note && <div className="rg-note">{g.note}</div>}
              </div>
              <div className="rg-cell-code">{g.code || "—"}</div>
              <div className="rg-cell-status">
                <span className={`rg-pill ${g.isActive ? "active" : "inactive"}`}>
                  {g.isActive ? "Actief" : "Inactief"}
                </span>
              </div>
              <div className="rg-cell-actions">
                <button className="rg-link" onClick={() => openEdit(g)}>
                  <Pencil size={16} /> Bewerken
                </button>
                <button className="rg-link" onClick={() => toggleActive(g.id)}>
                  <Power size={16} /> {g.isActive ? "Deactiveer" : "Activeer"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal add/edit */}
      {modalOpen && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editTarget ? "Omzetgroep bewerken" : "Omzetgroep toevoegen"}</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                Sluiten
              </button>
            </div>
            <div className="modal-body">
              <div className="rg-form">
                <label className="rg-field">
                  <span>Naam *</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Friet" />
                </label>
                <label className="rg-field">
                  <span>Code</span>
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Bijv. FRI" />
                </label>
                <label className="rg-field">
                  <span>Notitie</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optioneel" />
                </label>
                <label className="rg-checkbox">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  <span>Actief</span>
                </label>
                {error && <div className="rg-error">{error}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModalOpen(false)}>Annuleren</button>
              <button className="btn primary" onClick={save}>Opslaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
