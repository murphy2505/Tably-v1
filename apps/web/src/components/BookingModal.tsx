import { useEffect, useMemo, useState } from "react";
import { apiBookOrder, apiListTables } from "../api/pos/tables";
import http from "../services/http";

type Props = {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onOrderUpdated: (order: any) => void;
  onOpenCustomerModal?: () => void;
};

export default function BookingModal({ open, orderId, onClose, onOrderUpdated, onOpenCustomerModal }: Props) {
  const [tab, setTab] = useState<"TAFEL" | "GROEP" | "KLANT">("TAFEL");
  const [tables, setTables] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [tl, gr] = await Promise.all([
          apiListTables(),
          http.get<{ groups: any[] }>("/pos/groups").then((r) => r.data).catch(() => ({ groups: [] })),
        ]);
        setTables(tl.tables || []);
        setGroups(gr.groups || []);
      } catch {}
    })();
  }, [open]);

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [search, tables]);

  async function bookTable(id: string) {
    try {
      const updated = await apiBookOrder(orderId, { type: "TABLE", tableId: id });
      onOrderUpdated(updated);
      onClose();
    } catch {}
  }

  async function bookGroup(id: string) {
    try {
      const updated = await apiBookOrder(orderId, { type: "GROUP", groupId: id });
      onOrderUpdated(updated);
      onClose();
    } catch {}
  }

  async function createGroup() {
    const name = groupName.trim();
    if (!name) return;
    try {
      const res = await http.post<{ group: any }>("/pos/groups", { name });
      const g = res.data.group;
      setGroups((prev) => [...prev, g]);
      setGroupName("");
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="checkout-modal-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16, width: 520, maxWidth: "calc(100vw - 24px)" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button className={`btn ${tab === "TAFEL" ? "primary" : ""}`} onClick={() => setTab("TAFEL")}>Tafel</button>
          <button className={`btn ${tab === "GROEP" ? "primary" : ""}`} onClick={() => setTab("GROEP")}>Groep</button>
          <button className={`btn ${tab === "KLANT" ? "primary" : ""}`} onClick={() => setTab("KLANT")}>Klant</button>
        </div>

        {tab === "TAFEL" && (
          <div style={{ display: "grid", gap: 10 }}>
            <input className="orders-search" placeholder="Zoek tafel…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div style={{ display: "grid", gap: 8, maxHeight: 360, overflow: "auto" }}>
              {filteredTables.map((t) => (
                <button key={t.id} className="order-row" onClick={() => bookTable(t.id)}>
                  <div className="order-row-title">{t.name}</div>
                  <div className="order-row-meta">{t.status === "FREE" ? "Vrij" : t.status === "BUSY" ? "Bezet" : "Actief"}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "GROEP" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="orders-search" placeholder="Nieuwe groep naam…" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <button className="btn" onClick={createGroup}>Maak</button>
            </div>
            <div style={{ display: "grid", gap: 8, maxHeight: 360, overflow: "auto" }}>
              {groups.map((g) => (
                <button key={g.id} className="order-row" onClick={() => bookGroup(g.id)}>
                  <div className="order-row-title">{g.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "KLANT" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div>Gebruik de bestaande klantkoppeling voor zoeken/selecteren.</div>
            <button className="btn" onClick={() => { onClose(); onOpenCustomerModal && onOpenCustomerModal(); }}>Open klantkoppeling</button>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <button className="btn" onClick={onClose}>Sluiten</button>
          <button className="btn danger" onClick={async () => { try { const updated = await apiBookOrder(orderId, { type: "NONE" }); onOrderUpdated(updated); onClose(); } catch {} }}>Ontkoppelen</button>
        </div>
      </div>
    </div>
  );
}
