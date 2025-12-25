import { useNavigate } from "react-router-dom";

export default function BoekenSheet({
  open,
  onClose,
  ensureRealOrderIfNeeded,
  onSetDraftContext,
}: {
  open: boolean;
  onClose: () => void;
  ensureRealOrderIfNeeded: (reason: string) => Promise<string>;
  onSetDraftContext: (ctx: { orderType?: string | null }) => void;
}) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} onClick={onClose} />
      <div style={{ position: "relative", margin: "0 auto", maxWidth: 640, background: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 -8px 24px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
          <div style={{ fontWeight: 800 }}>Boeken</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>Kies hoe je wilt boeken</div>
        </div>

        <div style={{ display: "grid", gap: 10, padding: 12 }}>
          <button
            className="order-row"
            onClick={async () => {
              navigate(`/tables?pickForOrder=draft&returnTo=${encodeURIComponent("/pos")}`);
            }}
          >
            <div className="order-row-title">Boek op tafel</div>
            <div className="order-row-meta">Open tafel picker</div>
          </button>

          <button
            className="order-row"
            onClick={async () => {
              navigate(`/customers?pickForOrder=draft&returnTo=${encodeURIComponent("/pos")}`);
            }}
          >
            <div className="order-row-title">Boek op naam</div>
            <div className="order-row-meta">Open klanten zoeken</div>
          </button>

          <button
            className="order-row"
            onClick={async () => {
              const id = await ensureRealOrderIfNeeded("BOOK_TAKEAWAY");
              onSetDraftContext({ orderType: "TAKEAWAY" });
              navigate(`/orders/${id}`);
            }}
          >
            <div className="order-row-title">Boek als afhaal</div>
            <div className="order-row-meta">Markeer als afhaal</div>
          </button>
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" onClick={onClose}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}
