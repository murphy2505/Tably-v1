import { useEffect, useMemo, useState } from "react";
import {
  apiListProducts,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct,
  type Product,
} from "../api/pos/products";
import { apiListCategories, type CategoryDTO } from "../api/pos/categories";
import { apiListProductGroups, type ProductGroupDTO } from "../api/pos/product-groups";
import { apiListVatRates, type VatRateDTO } from "../api/pos/vatRates";
import { apiListVariants, apiCreateVariant, apiUpdateVariant, apiDeleteVariant, type VariantDTO } from "../api/pos/variants";

function formatEuroFromCents(cents: number): string {
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
  } catch {
    return `€ ${(cents / 100).toFixed(2)}`;
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  // Temporary audit log to verify dataflow
  // eslint-disable-next-line no-console
  console.log("PRODUCTS FROM API", products);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroupDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [onlyActive, setOnlyActive] = useState<boolean>(true);

  // Modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formName, setFormName] = useState("");
  const [formEuro, setFormEuro] = useState("0,00");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formProductGroupId, setFormProductGroupId] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formVatRateId, setFormVatRateId] = useState<string>("");
  const [vatRates, setVatRates] = useState<VatRateDTO[]>([]);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [variants, setVariants] = useState<VariantDTO[]>([]);
  const [variantFormName, setVariantFormName] = useState("");
  const [variantFormPrice, setVariantFormPrice] = useState("");
  const [variantFormSort, setVariantFormSort] = useState<number>(0);
  const [variantFormActive, setVariantFormActive] = useState<boolean>(true);
  const [variantEditId, setVariantEditId] = useState<string | null>(null);

  const { openCreate, openEdit, closeModal } = useModalState(
    setOpen,
    setEditing,
    setFormName,
    setFormEuro,
    setFormCategoryId,
    setFormProductGroupId,
    setFormIsActive,
    setFormVatRateId
  );

  async function onSave() {
    try {
      const payload = {
        name: formName.trim(),
        basePriceCents: parseEuroToCents(formEuro),
        isActive: formIsActive,
        categoryId: formCategoryId || null,
        productGroupId: formProductGroupId || null,
        vatRateId: formVatRateId || null,
      };
      if (!payload.name) {
        alert("Naam is verplicht");
        return;
      }
      // Categorie en productgroep zijn optioneel; stuur null indien leeg
      if (editing) {
        await apiUpdateProduct(editing.id, payload);
      } else {
        await apiCreateProduct(payload);
      }
      closeModal();
      await loadAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Opslaan mislukt");
    }
  }

  async function onDelete(p: Product) {
    try {
      if (!confirm(`Verwijder product: ${p.name}?`)) return;
      await apiDeleteProduct(p.id);
      await loadAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Verwijderen mislukt");
    }
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [p, c, pg, vr] = await Promise.all([
        apiListProducts(),
        apiListCategories(),
        apiListProductGroups().catch((err) => {
          console.error(err);
          alert("Productgroepen konden niet geladen worden (API ontbreekt of fout).");
          return [] as ProductGroupDTO[];
        }),
        apiListVatRates().catch(() => [] as VatRateDTO[]),
      ]);
      setProducts(p || []);
      setCategories(c || []);
      setProductGroups(pg || []);
      setVatRates(vr || []);
    } catch (e: any) {
      setError(e?.message || "Kon gegevens niet laden");
    } finally {
      setLoading(false);
    }
  }
  async function openVariantsModal(p: Product) {
    try {
      setVariantEditId(null);
      setVariantFormName("");
      setVariantFormPrice("");
      setVariantFormSort(0);
      setVariantFormActive(true);
      setEditing(p);
      const list = await apiListVariants(p.id);
      const maxSort = list.reduce((m, v) => Math.max(m, v.sortOrder ?? 0), 0);
      setVariantFormSort(list.length ? maxSort + 1 : 0);
      setVariants(list);
      setVariantsOpen(true);
    } catch (err) {
      console.error("openVariantsModal", err);
      alert("Kon varianten niet laden. Bekijk console voor details.");
    }
  }

  function closeVariantsModal() {
    setVariantsOpen(false);
    setEditing(null);
  }

  async function saveVariant() {
    if (!editing) return;
    try {
      const name = variantFormName.trim();
      if (!name) {
        alert("Naam is verplicht voor variant");
        return;
      }
      const payload: any = {
        productId: editing.id,
        name,
        isActive: Boolean(variantFormActive),
      };
      if (Number.isFinite(variantFormSort)) {
        payload.sortOrder = Math.trunc(variantFormSort as number);
      }
      const priceCents = parseEuroToCentsOptional(variantFormPrice);
      if (priceCents !== undefined) {
        payload.priceOverrideCents = priceCents;
      }
      if (variantEditId) {
        await apiUpdateVariant(variantEditId, payload);
      } else {
        await apiCreateVariant(payload);
      }
      const list = await apiListVariants(editing.id);
      setVariants(list);
      setVariantEditId(null);
      setVariantFormName("");
      setVariantFormPrice("");
      const maxSort = list.reduce((m, v) => Math.max(m, v.sortOrder ?? 0), 0);
      setVariantFormSort(list.length ? maxSort + 1 : 0);
      setVariantFormActive(true);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("saveVariant error", {
        error: err?.message || err,
        response: err?.response?.data,
      });
      alert("Kon variant niet opslaan. Bekijk console voor details.");
    }
  }

  async function editVariant(v: VariantDTO) {
    setVariantEditId(v.id);
    setVariantFormName(v.name);
    setVariantFormPrice(v.priceOverrideCents != null ? (v.priceOverrideCents / 100).toFixed(2).replace(".", ",") : "");
    setVariantFormSort(v.sortOrder ?? 0);
    setVariantFormActive(v.isActive);
  }

  async function deleteVariant(v: VariantDTO) {
    if (!confirm(`Verwijder variant: ${v.name}?`)) return;
    try {
      await apiDeleteVariant(v.id);
      if (editing) {
        const list = await apiListVariants(editing.id);
        setVariants(list);
      }
    } catch (err) {
      console.error("deleteVariant", err);
      alert("Kon variant niet verwijderen. Bekijk console voor details.");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    return [...products]
      .filter((p) => (onlyActive ? p.isActive === true : true))
      .filter((p) => (categoryId !== "all" ? (p.category?.id ?? "") === categoryId : true))
      .filter((p) => (qlc ? p.name.toLowerCase().includes(qlc) : true))
      .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }, [products, onlyActive, categoryId, q]);

  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories]);

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Producten</h1>
        <div>Bezig…</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Producten</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ padding: "6px 8px" }}
            aria-label="Filter op categorie"
          >
            <option value="all">Alle categorieën</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="search"
            placeholder="Zoeken…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ padding: "6px 8px", width: 220 }}
            aria-label="Zoek op productnaam"
          />

          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
            Alleen actief
          </label>

          <button onClick={loadAll} aria-label="Vernieuwen" title="Vernieuwen" style={{ padding: "6px 10px" }}>
            Refresh
          </button>

          <button onClick={() => openCreate()} style={{ padding: "6px 10px" }}>
            + Nieuw product
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div>Geen producten.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Naam</th>
                <th style={th}>Categorie</th>
                <th style={th}>Productgroep</th>
                <th style={th}>Prijs</th>
                <th style={th}>Status</th>
                <th style={th}>Varianten</th>
                <th style={th}>Acties</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ opacity: 0.6, fontSize: 12 }}>{p.id}</div>
                  </td>
                  <td style={td}>{p.category?.name ?? "—"}</td>
                  <td style={td}>{p.productGroup?.name ?? "—"}</td>
                  <td style={td}>{formatEuroFromCents(p.basePriceCents)}</td>
                  <td style={td}>{p.isActive ? "Actief" : "Inactief"}</td>
                  <td style={td}>
                    <button onClick={() => openVariantsModal(p)} style={btnNeutral}>Varianten</button>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(p)} style={btnNeutral}>
                        Bewerk
                      </button>
                      <button onClick={() => onDelete(p)} style={btnDanger}>
                        Verwijder
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div style={modalOverlay}>
          <div style={modalBody} role="dialog" aria-modal="true" aria-label={editing ? "Product bewerken" : "Nieuw product"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editing ? "Product bewerken" : "Nieuw product"}</h2>
              <button onClick={closeModal} aria-label="Sluiten">✕</button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={labelRow}>
                <span>Naam</span>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Naam" />
              </label>

              <label style={labelRow}>
                <span>Prijs (EUR)</span>
                <input
                  value={formEuro}
                  onChange={(e) => setFormEuro(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </label>

              <label style={labelRow}>
                <span>Categorie</span>
                <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)}>
                  <option value="">— geen —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={labelRow}>
                <span>Productgroep</span>
                <select
                  value={formProductGroupId}
                  onChange={(e) => setFormProductGroupId(e.target.value)}
                >
                  <option value="">—</option>
                  {productGroups.filter((g) => g.isActive !== false).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
                Actief
              </label>

              <label style={labelRow}>
                <span>BTW-tarief</span>
                <select value={formVatRateId} onChange={(e) => setFormVatRateId(e.target.value)}>
                  <option value="">— standaard (tenant) —</option>
                  {vatRates.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={closeModal}>Annuleer</button>
              <button onClick={onSave} style={btnPrimary}>Opslaan</button>
            </div>
          </div>
        </div>
      )}

      {variantsOpen && editing && (
        <div style={modalOverlay}>
          <div style={modalBody} role="dialog" aria-modal="true" aria-label={`Varianten voor ${editing.name}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Varianten: {editing.name}</h2>
              <button onClick={closeVariantsModal} aria-label="Sluiten">✕</button>
            </div>
            {variants.length === 0 ? (
              <div>Geen varianten.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Naam</th>
                      <th style={th}>Prijs override</th>
                      <th style={th}>Sort</th>
                      <th style={th}>Status</th>
                      <th style={th}>Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants
                      .slice()
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "nl"))
                      .map((v) => (
                        <tr key={v.id}>
                          <td style={td}>{v.name}</td>
                          <td style={td}>{v.priceOverrideCents != null ? formatEuroFromCents(v.priceOverrideCents) : "—"}</td>
                          <td style={td}>{v.sortOrder ?? 0}</td>
                          <td style={td}>{v.isActive ? "Actief" : "Inactief"}</td>
                          <td style={td}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => editVariant(v)} style={btnNeutral}>Bewerk</button>
                              <button onClick={() => deleteVariant(v)} style={btnDanger}>Verwijder</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{variantEditId ? "Variant bewerken" : "Nieuwe variant"}</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={labelRow}>
                  <span>Naam</span>
                  <input value={variantFormName} onChange={(e) => setVariantFormName(e.target.value)} placeholder="Naam" />
                </label>
                <label style={labelRow}>
                  <span>Prijs override (EUR)</span>
                  <input value={variantFormPrice} onChange={(e) => setVariantFormPrice(e.target.value)} placeholder="" inputMode="decimal" />
                </label>
                <label style={labelRow}>
                  <span>Sort</span>
                  <input type="number" value={variantFormSort} onChange={(e) => setVariantFormSort(Number(e.target.value) || 0)} />
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={variantFormActive} onChange={(e) => setVariantFormActive(e.target.checked)} />
                  Actief
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button onClick={() => { setVariantEditId(null); setVariantFormName(""); setVariantFormPrice(""); }}>
                  Reset
                </button>
                <button onClick={saveVariant} style={btnPrimary}>Opslaan variant</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 600,
  fontSize: 13,
  color: "#374151",
};

const td: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
};

const btnDisabled: React.CSSProperties = {
  padding: "6px 10px",
  opacity: 0.6,
  cursor: "not-allowed",
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  borderRadius: 6,
};

const btnNeutral: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: 6,
};

const btnDanger: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #fecaca",
  background: "#fee2e2",
  color: "#7f1d1d",
  borderRadius: 6,
};

const btnPrimary: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #2563eb",
  background: "#3b82f6",
  color: "white",
  borderRadius: 6,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalBody: React.CSSProperties = {
  background: "white",
  width: "100%",
  maxWidth: 520,
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const labelRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  alignItems: "center",
  gap: 10,
};

function parseEuroToCents(input: string): number {
  const norm = input.replace(/\s+/g, "").replace(/,/g, ".");
  const v = Number(norm);
  if (Number.isFinite(v)) return Math.round(v * 100);
  return 0;
}

// Returns undefined when empty/invalid, otherwise integer cents
function parseEuroToCentsOptional(input: string): number | undefined {
  const trimmed = (input || "").trim();
  if (!trimmed) return undefined;
  const norm = trimmed.replace(/\s+/g, "").replace(/,/g, ".");
  const v = Number(norm);
  if (!Number.isFinite(v)) return undefined;
  return Math.round(v * 100);
}

// Modal helpers
function useModalState(
  setOpen: (v: boolean) => void,
  setEditing: (p: Product | null) => void,
  setFormName: (v: string) => void,
  setFormEuro: (v: string) => void,
  setFormCategoryId: (v: string) => void,
  setFormProductGroupId: (v: string) => void,
  setFormIsActive: (v: boolean) => void,
  setFormVatRateId: (v: string) => void
) {
  function openCreate() {
    setEditing(null);
    setFormName("");
    setFormEuro("0,00");
    setFormCategoryId("");
    setFormProductGroupId("");
    setFormIsActive(true);
    setFormVatRateId("");
    setOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setFormName(p.name);
    setFormEuro((p.basePriceCents / 100).toFixed(2).replace(".", ","));
    setFormCategoryId(p.category?.id ?? "");
    setFormProductGroupId(p.productGroup?.id ?? "");
    setFormIsActive(p.isActive);
    setFormVatRateId(p.vatRate?.id ?? "");
    setOpen(true);
  }
  function closeModal() {
    setOpen(false);
  }
  return { openCreate, openEdit, closeModal };
}

// attach modal helpers to component scope
function _bindModalHelpers(ctx: any) {
  const { setOpen, setEditing, setFormName, setFormEuro, setFormCategoryId, setFormProductGroupId, setFormIsActive, setFormVatRateId } = ctx;
  return useModalState(setOpen, setEditing, setFormName, setFormEuro, setFormCategoryId, setFormProductGroupId, setFormIsActive, setFormVatRateId);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __ensureTreeShake = _bindModalHelpers;

