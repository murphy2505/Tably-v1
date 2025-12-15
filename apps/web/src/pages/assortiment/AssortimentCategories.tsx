import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Power, Trash } from "lucide-react";
import { apiListCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory, type CategoryDTO } from "../../api/pos/categories";

export default function AssortimentCategories() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const editTarget = useMemo(() => categories.find((c) => c.id === editId) ?? null, [categories, editId]);
  const [formName, setFormName] = useState("");
  const [formSort, setFormSort] = useState<number>(0);
  const [formActive, setFormActive] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

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

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await apiListCategories();
      setCategories(Array.isArray(list) ? list : []);
    } catch (e) {
      setCategories([]);
      setError(e instanceof Error ? e.message : "Onbekende fout bij laden categorieën");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditId(null);
    setFormName("");
    setFormSort(0);
    setFormActive(true);
    setActionError(null);
    setModalOpen(true);
  }

  function openEdit(cat: CategoryDTO) {
    setEditId(cat.id);
    setFormName(cat.name);
    setFormSort(cat.sortOrder ?? 0);
    setFormActive(cat.isActive);
    setActionError(null);
    setModalOpen(true);
  }

  async function submitForm() {
    try {
      setActionError(null);
      if (editId) {
        await apiUpdateCategory(editId, { name: formName, sortOrder: formSort, isActive: formActive });
      } else {
        await apiCreateCategory({ name: formName, sortOrder: formSort, isActive: formActive });
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Kon categorie niet opslaan");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Weet je zeker dat je deze categorie wilt verwijderen?")) return;
    try {
      setActionError(null);
      await apiDeleteCategory(id);
      await refresh();
    } catch (e: any) {
      const msg = e?.response?.status === 409 ? "Categorie heeft gekoppelde producten" : (e instanceof Error ? e.message : "Kon categorie niet verwijderen");
      setActionError(msg);
    }
  }

  async function toggleActive(cat: CategoryDTO) {
    try {
      setActionError(null);
      await apiUpdateCategory(cat.id, { isActive: !cat.isActive });
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Kon status niet wijzigen");
    }
  }

  const empty = !loading && !error && categories.length === 0;

  return (
    <div className="rg-page">
      <div className="rg-header">
        <div className="rg-titles">
          <h1>Categorieën</h1>
          <p className="rg-subtitle">Beheer productcategorieën voor nette menustructuur en filtering.</p>
        </div>
        <div className="rg-actions">
          <button className="btn primary" onClick={openCreate}>
            <Plus size={16} />
            <span>Nieuwe categorie</span>
          </button>
        </div>
      </div>

      <div className="rg-cards">
        <div className="rg-card">
          <div className="rg-card-title">Structuur</div>
          <div className="rg-card-body">Gebruik categorieën zoals Friet, Snacks, Dranken.</div>
        </div>
        <div className="rg-card">
          <div className="rg-card-title">Sortering</div>
          <div className="rg-card-body">De sortOrder bepaalt de volgorde in lijsten.</div>
        </div>
        <div className="rg-card">
          <div className="rg-card-title">Status</div>
          <div className="rg-card-body">Activeer of deactiveer om tijdelijk te verbergen.</div>
        </div>
      </div>

      {loading && <div className="rg-empty"><div className="rg-card">Categorieën laden…</div></div>}
      {!loading && error && (
        <div className="rg-empty">
          <div className="rg-card">
            <div className="rg-card-title">Kon categorieën niet laden</div>
            <div className="rg-card-body">{error}</div>
          </div>
        </div>
      )}

      {empty ? (
        <div className="rg-empty">
          <div className="rg-card">
            <div className="rg-card-title">Nog geen categorieën</div>
            <div className="rg-card-body">Maak je eerste categorie om te starten.</div>
            <button className="btn primary" onClick={openCreate}>
              <Plus size={16} /> Maak categorie
            </button>
          </div>
        </div>
      ) : (!loading && !error) ? (
        <div className="rg-table">
          <div className="rg-row rg-head">
            <div>Naam</div>
            <div>Sort</div>
            <div>Status</div>
            <div>Acties</div>
          </div>
          {categories.map((c) => (
            <div className="rg-row" key={c.id}>
              <div className="rg-cell-name">
                <div className="rg-name">{c.name}</div>
              </div>
              <div className="rg-cell-code">{c.sortOrder ?? 0}</div>
              <div className="rg-cell-status">
                <span className={`rg-pill ${c.isActive ? "active" : "inactive"}`}>{c.isActive ? "Actief" : "Inactief"}</span>
              </div>
              <div className="rg-cell-actions">
                <button className="rg-link" onClick={() => openEdit(c)}>
                  <Pencil size={16} /> Bewerken
                </button>
                <button className="rg-link" onClick={() => toggleActive(c)}>
                  <Power size={16} /> {c.isActive ? "Deactiveer" : "Activeer"}
                </button>
                <button className="rg-link" onClick={() => onDelete(c.id)}>
                  <Trash size={16} /> Verwijder
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {actionError && (
        <div className="rg-error" style={{ marginTop: 10 }}>{actionError}</div>
      )}

      {modalOpen && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editTarget ? "Categorie bewerken" : "Nieuwe categorie"}</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>Sluiten</button>
            </div>
            <div className="modal-body">
              <div className="rg-form">
                <label className="rg-field">
                  <span>Naam *</span>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Bijv. Friet" />
                </label>
                <label className="rg-field">
                  <span>Sort</span>
                  <input type="number" value={formSort} onChange={(e) => setFormSort(Number(e.target.value) || 0)} placeholder="Bijv. 1" />
                </label>
                <label className="rg-checkbox">
                  <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                  <span>Actief</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModalOpen(false)}>Annuleren</button>
              <button className="btn primary" onClick={submitForm}>{editTarget ? "Opslaan" : "Aanmaken"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
