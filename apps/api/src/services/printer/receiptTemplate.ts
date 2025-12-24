import { ESC, GS, init, alignLeft, alignCenter, boldOn, boldOff, doubleSizeOn, doubleSizeOff, hsep, feed, cutFull, cutPartial, starCut } from "./escposCommands";
import { escposAsciiSafe } from "../printing";

export type ReceiptTenant = { name: string; addressLine?: string; phone?: string; vatId?: string; kvk?: string };
export type ReceiptLine = { name: string; qty: number; unitPriceCents: number; totalCents?: number };
export type ReceiptTotals = { subtotalExVatCents: number; vatCents: number; totalInclVatCents: number; vatLabel?: string };
export type ReceiptPayment = { method: string; paidAt?: string | Date | null };
export type ReceiptOrder = {
  label?: string | number;
  createdAt?: string | Date;
  customerName?: string | null;
  tableName?: string | null;
  lines: ReceiptLine[];
  totals: ReceiptTotals;
  payment?: ReceiptPayment | null;
};

export type DriverKind = "ESC_POS_TCP" | "STAR_ESC_POS_TCP";

function text(buf: number[], s: string, asciiMode: boolean) {
  const out = asciiMode ? escposAsciiSafe(s) : s;
  const bytes = Buffer.from(out, asciiMode ? "ascii" : "utf8");
  for (const b of bytes) buf.push(b);
}

function rightAmount(amountCents: number, width = 42): string {
  const amt = (amountCents / 100).toFixed(2).replace(".", ",");
  const label = `€ ${amt}`;
  const pad = Math.max(1, width - label.length);
  return `${" ".repeat(pad)}${label}`;
}

function wrapName(name: string, max = 32): string[] {
  const words = name.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + (cur ? " " : "") + w).length <= max) cur = cur ? `${cur} ${w}` : w;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function buildReceipt80(params: {
  tenant: ReceiptTenant;
  order: ReceiptOrder;
  driver: DriverKind;
  asciiMode?: boolean;
}): Buffer {
  const { tenant, order, driver, asciiMode = true } = params;
  // Normalize totals in case caller did not provide the aggregated structure
  const subtotal = typeof order?.totals?.subtotalExVatCents === "number"
    ? order.totals.subtotalExVatCents
    : (order?.lines || []).reduce((s, l) => s + Math.max(1, Number(l.qty || 1)) * Number(l.unitPriceCents || 0), 0);
  const total = typeof order?.totals?.totalInclVatCents === "number" ? order.totals.totalInclVatCents : subtotal;
  const vat = typeof order?.totals?.vatCents === "number" ? order.totals.vatCents : (total - subtotal);
  const totalsNorm: ReceiptTotals = {
    subtotalExVatCents: subtotal,
    vatCents: vat,
    totalInclVatCents: total,
    vatLabel: order?.totals?.vatLabel || "BTW",
  };
  const buf: number[] = [];
  init(buf);
  alignCenter(buf);
  boldOn(buf); doubleSizeOn(buf);
  text(buf, `${tenant.name}\n`, asciiMode);
  doubleSizeOff(buf); boldOff(buf);
  if (tenant.addressLine) text(buf, `${tenant.addressLine}\n`, asciiMode);
  if (tenant.phone) text(buf, `${tenant.phone}\n`, asciiMode);
  if (tenant.vatId) text(buf, `BTW: ${tenant.vatId}\n`, asciiMode);
  if (tenant.kvk) text(buf, `KVK: ${tenant.kvk}\n`, asciiMode);

  feed(buf, 1);
  alignLeft(buf);
  boldOn(buf); doubleSizeOn(buf);
  const bonLabel = order.label != null ? String(order.label) : "Bon";
  text(buf, `Bon ${bonLabel}\n`, asciiMode);
  doubleSizeOff(buf); boldOff(buf);
  if (order.createdAt) {
    try {
      const dt = typeof order.createdAt === "string" ? new Date(order.createdAt) : order.createdAt;
      text(buf, `${dt.toLocaleString("nl-NL")}\n`, asciiMode);
    } catch {}
  }
  if (order.customerName) text(buf, `Klant: ${order.customerName}\n`, asciiMode);
  if (order.tableName) text(buf, `Tafel: ${order.tableName}\n`, asciiMode);

  hsep(buf, 42);
  // Items
  for (const line of order.lines) {
    const qty = Math.max(1, Number(line.qty || 1));
    const unit = Number(line.unitPriceCents || 0);
    const total = typeof line.totalCents === "number" ? line.totalCents : qty * unit;
    const nameLines = wrapName(line.name || "Item", 28);
    const first = nameLines.shift() || "";
    text(buf, `${qty}x ${first}`, asciiMode);
    text(buf, rightAmount(total, 42 - (qty + 2 + first.length)), asciiMode);
    buf.push(0x0a);
    for (const nl of nameLines) { text(buf, `    ${nl}\n`, asciiMode); }
  }

  hsep(buf, 42);
  const subt = totalsNorm.subtotalExVatCents;
  const vatAmt = totalsNorm.vatCents;
  const tot = totalsNorm.totalInclVatCents;
  text(buf, `Subtotaal excl. btw`, asciiMode); text(buf, rightAmount(subt), asciiMode); buf.push(0x0a);
  const vatLbl = totalsNorm.vatLabel || "BTW";
  text(buf, `${vatLbl}`, asciiMode); text(buf, rightAmount(vatAmt), asciiMode); buf.push(0x0a);
  boldOn(buf);
  text(buf, `Totaal`, asciiMode); text(buf, rightAmount(tot), asciiMode); buf.push(0x0a);
  boldOff(buf);

  // Payment
  if (order.payment?.method) {
    text(buf, `Betaald: ${order.payment.method}\n`, asciiMode);
  }

  alignCenter(buf);
  feed(buf, 1);
  text(buf, `Bedankt en eet smakelijk!\n\n`, asciiMode);
  // Final feed + cut per driver
  if (driver === "STAR_ESC_POS_TCP") { feed(buf, 3); starCut(buf); }
  else { feed(buf, 5); cutFull(buf); }

  return Buffer.from(buf);
}

export function buildTestCut(driver: DriverKind): Buffer {
  const buf: number[] = [];
  init(buf); alignCenter(buf);
  boldOn(buf); text(buf, "Snij-test\n", true); boldOff(buf);
  feed(buf, 1);
  if (driver === "STAR_ESC_POS_TCP") { feed(buf, 3); starCut(buf); }
  else { feed(buf, 5); cutFull(buf); }
  return Buffer.from(buf);
}

export function buildDrawerPulse(asciiNote: string = "Lade test"): Buffer {
  const buf: number[] = [];
  init(buf); alignCenter(buf);
  boldOn(buf); text(buf, `${asciiNote}\n`, true); boldOff(buf);
  // ESC p 0 0x19 0xFA
  buf.push(ESC, 0x70, 0x00, 0x19, 0xFA);
  feed(buf, 2);
  return Buffer.from(buf);
}
