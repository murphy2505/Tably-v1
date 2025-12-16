import { useEffect, useMemo, useState } from "react";

export type ModifierOption = { id: string; name: string; priceDeltaCents: number };
export type ModifierGroup = { id: string; name: string; minSelect: number; maxSelect: number; options: ModifierOption[] };

export default function ModifierSheet({
  open,
  onClose,
  product,
  groups,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  product: { id: string; name: string; priceCents: number };
  groups: ModifierGroup[];
  onConfirm: (selectedOptionIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, Set<string>> = {};
      for (const g of groups) init[g.id] = new Set<string>();
      setSelected(init);
    }
  }, [open]);

  function toggle(gid: string, oid: string, isSingle: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[gid] ?? []);
      if (isSingle) {
        if (set.has(oid)) set.delete(oid); else { set.clear(); set.add(oid); }
      } else {
        if (set.has(oid)) set.delete(oid); else set.add(oid);
      }
      next[gid] = set;
      return next;
    });
  }

  const deltaTotal = useMemo(() => {
    let total = 0;
    for (const g of groups) {
      const set = selected[g.id] ?? new Set<string>();
      for (const oid of Array.from(set)) {
        const opt = g.options.find((o) => o.id === oid);
        if (opt) total += opt.priceDeltaCents;
      }
    }
    return total;
  }, [selected, groups]);

  const canConfirm = useMemo(() => {
    for (const g of groups) {
      const cnt = (selected[g.id]?.size ?? 0);
      if (cnt < (g.minSelect ?? 0)) return false;
      if (g.maxSelect != null && cnt > g.maxSelect) return false;
    }
    return true;
  }, [selected, groups]);

  function confirm() {
    const ids: string[] = [];
    for (const g of groups) {
      for (const oid of Array.from(selected[g.id] ?? [])) ids.push(oid);
    }
    onConfirm(ids);
  }

  if (!open) return null;

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} onClick={onClose} />
      <div style={{ position: "relative", margin: "0 auto", maxWidth: 640, background: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 -8px 24px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
          <div style={{ fontWeight: 600 }}>{product.name}</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>Maak je keuze</div>
        </div>
        <div style={{ maxHeight: 360, overflow: "auto", padding: 12 }}>
          {groups.map((g) => {
            const isSingle = (g.maxSelect ?? 1) === 1;
            const set = selected[g.id] ?? new Set<string>();
            return (
              <div key={g.id} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{g.name}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>
                  {g.minSelect > 0 ? `min ${g.minSelect}` : "optioneel"}{g.maxSelect ? ` · max ${g.maxSelect}` : ""}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {g.options.map((o) => {
                    const checked = set.has(o.id);
                    return (
                      <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, border: "1px solid #eee", borderRadius: 8 }}>
                        <input type={isSingle ? "radio" : "checkbox"} checked={checked} onChange={() => toggle(g.id, o.id, isSingle)} />
                        <span style={{ flex: 1 }}>{o.name}</span>
                        {o.priceDeltaCents !== 0 && <span style={{ fontSize: 12, opacity: 0.7 }}>{o.priceDeltaCents > 0 ? `+€${(o.priceDeltaCents/100).toFixed(2)}` : `-€${Math.abs(o.priceDeltaCents/100).toFixed(2)}`}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" onClick={onClose}>Annuleer</button>
          <div style={{ flex: 1 }} />
          <div style={{ fontWeight: 600 }}>€{((product.priceCents + deltaTotal)/100).toFixed(2)}</div>
          <button className="btn primary" disabled={!canConfirm} onClick={confirm}>Toevoegen</button>
        </div>
      </div>
    </div>
  );
}
