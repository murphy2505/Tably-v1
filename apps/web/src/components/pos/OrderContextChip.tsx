import { MouseEvent } from "react";
import type { OrderDTO } from "../../api/pos/orders";

export type DraftOrderContext = {
  tableId?: string | null;
  customerName?: string | null;
  orderType?: "WALKIN" | "TAKEAWAY" | string | null;
  source?: "WEBSHOP" | string | null;
};

export default function OrderContextChip({ order, draft, onClick }: { order: OrderDTO | null; draft?: DraftOrderContext; onClick: (e: MouseEvent) => void }) {
  const label = (() => {
    const linesCount = (order?.lines ?? []).length;
    const table: any = (order as any)?.table || null;
    const tableId: string | null = ((order as any)?.tableId as string) || draft?.tableId || null;
    const customerName: string | null = order?.customer?.name ?? draft?.customerName ?? null;
    const orderType: string | null = ((order as any)?.orderType as string) ?? draft?.orderType ?? null;
    const source: string | null = ((order as any)?.source as string) ?? draft?.source ?? null;

    if (tableId || table) {
      const tLabel = (table?.name || table?.label || tableId || "?") as string;
      return `Tafel ${tLabel.startsWith("T") ? tLabel : `T${tLabel}`}`;
    }
    if (customerName) return `Op naam: ${customerName}`;
    if (orderType === "TAKEAWAY") return "Afhaal";
    if (source === "WEBSHOP") return "Webshop";
    const isWalkin = orderType === "WALKIN" || orderType == null;
    if (isWalkin && linesCount === 0) return "Niet geboekt";
    // Fallback
    return isWalkin ? "Niet geboekt" : (orderType || "Context");
  })();

  return (
    <button
      className="btn"
      onClick={onClick}
      title="Boeking"
      style={{ borderRadius: 999, background: "#fff", border: "1px solid #e5e7eb", padding: "6px 10px" }}
    >
      {label}
    </button>
  );
}
