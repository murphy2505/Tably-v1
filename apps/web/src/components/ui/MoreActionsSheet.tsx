import LastReceiptTrigger from "../../components/LastReceiptTrigger";
import { useNavigate } from "react-router-dom";
import { FileText, StickyNote, Combine, Split, Search, Percent, Bug } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MoreActionsSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div className="checkout-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="checkout-modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Meer acties</div>
          <button className="modal-close" onClick={onClose}>Sluiten</button>
        </div>
        <div className="modal-body" style={{ display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Bon acties</div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} />
              <LastReceiptTrigger variant="header" />
            </div>
            <button className="btn" onClick={() => alert("Notitie toevoegen — binnenkort beschikbaar")} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <StickyNote size={18} /> Notitie toevoegen
            </button>
            <button className="btn" onClick={() => alert("Samenvoegen — binnenkort beschikbaar")} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Combine size={18} /> Samenvoegen
            </button>
            <button className="btn" onClick={() => alert("Splitsen — later beschikbaar")} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Split size={18} /> Splitsen
            </button>
          </div>

          <div style={{ fontWeight: 800, marginTop: 6 }}>Snelle tools</div>
          <div style={{ display: "grid", gap: 8 }}>
            <button className="btn" onClick={() => navigate("/customers")} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Search size={18} /> Klant zoeken
            </button>
            <button className="btn" onClick={() => alert("Kortingen — later beschikbaar")} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Percent size={18} /> Kortingen
            </button>
            <button className="btn" onClick={() => alert("Debug/Test — dev only")} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Bug size={18} /> Debug / Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
