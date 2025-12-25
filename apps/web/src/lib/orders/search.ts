import type { OrderDTO } from "../../api/pos/orders";

export type OrderFilterKind =
  | "ALLE"
  | "OPEN"
  | "HOLD"
  | "CONFIRMED"
  | "READY";

// Normalizes a search query and matches against multiple fields
export function matchesQuery(o: OrderDTO, qRaw: string): boolean {
  const q = (qRaw || "").trim().toLowerCase();
  if (!q) return true;
  const tail = o.id.slice(-6).toLowerCase();
  const receipt = (o.receiptLabel || o.draftLabel || "").toLowerCase();
  const cust = (o.customer?.name || o.customer?.phoneE164 || "").toLowerCase();
  const table = ((o as any).table?.name || "").toLowerCase();
  const hay = [tail, receipt, cust, table].join(" ");
  // phone last 4 match
  const last4 = cust.replace(/\D+/g, "").slice(-4);
  return hay.includes(q) || (!!last4 && q.includes(last4));
}

export function contextLabel(o: OrderDTO): string {
  if ((o as any).tableId || (o as any).table) {
    const label = (o as any).table?.name || `Tafel ${(o as any).tableId}`;
    return label.startsWith("Tafel") ? label : `Tafel ${label}`;
  }
  if (o.customer) {
    return o.customer.name || o.customer.phoneE164 || "Op naam";
  }
  // Heuristics
  const kind = (o as any).kind || "QUICK";
  const draft = o.draftLabel || "";
  if (/web|online/i.test(draft)) return "Webshop";
  if (kind === "QUICK") return "Afhaal";
  return `Bon ${o.receiptLabel || o.id.slice(-6)}`;
}

export function filterKind(o: OrderDTO, f: OrderFilterKind): boolean {
  if (f === "ALLE") return true;
  if (f === "OPEN") return (o.status || "OPEN") === "OPEN";
  if (f === "HOLD") return (o.status || "OPEN") === "PARKED";
  if (f === "CONFIRMED") return (o.status === "SENT" || o.status === "IN_PREP");
  if (f === "READY") return o.status === "READY";
  return true;
}

export function itemsPreview(o: OrderDTO): { count: number; names: string[] } {
  const lines = o.lines || [];
  const count = lines.reduce((s, l) => s + (l.qty || 0), 0);
  const names: string[] = [];
  for (const l of lines) {
    if (names.length >= 3) break;
    if (l.title) names.push(l.title);
  }
  return { count, names };
}

export function minutesOpen(o: OrderDTO): number {
  try {
    const d = new Date(o.createdAt).getTime();
    return Math.max(0, Math.round((Date.now() - d) / 60000));
  } catch {
    return 0;
  }
}

export function euro(cents: number | null | undefined): string {
  const v = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v / 100);
}
