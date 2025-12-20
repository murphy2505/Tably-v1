import type { Buffer } from "buffer";
import { printEscposTcpDriver } from "./drivers/escposTcp";
import { printStarTest, printStarReceipt } from "./drivers/star";

export type PrintJobKind = "TEST" | "RECEIPT" | "KITCHEN" | "QR_CARD";
export type PrintJob = { kind: PrintJobKind; payload?: any };

export type PrinterLike = {
  id: string;
  name: string;
  driver: string;
  host: string;
  port: number;
  httpUrl?: string | null;
  paperWidth?: number | null;
  escposAsciiMode?: boolean | null;
};

export async function printToPrinter(printer: PrinterLike, job: PrintJob): Promise<void> {
  const drv = String(printer.driver);
  if (drv === "STAR_ESC_POS_TCP" || drv === "STARPRNT") {
    if (job.kind === "TEST") return printStarTest(printer);
    if (job.kind === "RECEIPT") return printStarReceipt(printer, job.payload || {});
    throw new Error(`JOB_NOT_SUPPORTED:${job.kind}`);
  }
  if (drv === "ESC_POS_TCP" || drv === "EPOS_HTTP" || drv === "GENERIC_ESCPOS") {
    return printEscposTcpDriver(printer, job);
  }
  throw new Error(`DRIVER_NOT_IMPLEMENTED:${drv}`);
}

export async function printTest(printer: PrinterLike): Promise<void> {
  return printToPrinter(printer, { kind: "TEST" });
}

// ASCII-safe normalization for ESC/POS (Epson)
export function escposAsciiSafe(input: string): string {
  return String(input)
    .replace(/€/g, "EUR")
    .replace(/×/g, "x")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\n\r\t]/g, "");
}

// Minimal ESC/POS receipt builder (UTF-8 to bytes + cut command)
export function buildEscposReceiptPayload(order: any, driver: "ESC_POS_TCP" | "STAR_ESC_POS_TCP", asciiMode: boolean = true): Buffer {
  const ESC = 0x1b; const GS = 0x1d;
  const lines: number[] = [];
  const push = (...nums: number[]) => { lines.push(...nums); };
  const text = (s: string) => {
    if (asciiMode) {
      const safe = escposAsciiSafe(s);
      lines.push(...Buffer.from(safe, "ascii"));
    } else {
      lines.push(...Buffer.from(s, "utf8"));
    }
  };

  push(ESC, 0x40); // init
  push(ESC, 0x61, 0x01); // center
  push(GS, 0x21, 0x11); text("Tably — Bon\n"); push(GS, 0x21, 0x00);
  push(ESC, 0x61, 0x00); // left

  const label = order?.receiptLabel || order?.draftLabel || String(order?.id || "").slice(-6);
  if (label) text(`Bon: ${label}\n`);
  if (order?.createdAt) {
    try { text(`Tijd: ${new Date(order.createdAt).toLocaleString("nl-NL")}\n`); } catch {}
  }
  text("\n");

  const items = (order?.lines || []).map((l: any) => ({ title: l.title ?? "Item", qty: Number(l.qty ?? 1), unit: Number(l.priceCents ?? 0) }));
  for (const l of items) {
    const total = l.qty * l.unit;
    text(`${l.qty}x ${l.title}\n`);
    const amt = (total / 100).toFixed(2).replace(".", ",");
    text(`  € ${amt}\n`);
  }
  text("\n");
  const subtotal = typeof order?.subtotalExclVatCents === "number" ? order.subtotalExclVatCents : items.reduce((s, it) => s + it.qty * it.unit, 0);
  const vat = typeof order?.vatCents === "number" ? order.vatCents : 0;
  const total = typeof order?.totalInclVatCents === "number" ? order.totalInclVatCents : subtotal + vat;
  text(`Subtotaal: € ${(subtotal/100).toFixed(2).replace(".", ",")}\n`);
  text(`BTW: € ${(vat/100).toFixed(2).replace(".", ",")}\n`);
  push(GS, 0x21, 0x01); text(`TOTAAL: € ${(total/100).toFixed(2).replace(".", ",")}\n`); push(GS, 0x21, 0x00);
  text("\nBedankt!\n\n");

  if (driver === "STAR_ESC_POS_TCP") { push(ESC, 0x64, 0x03); push(ESC, 0x69); }
  else { push(ESC, 0x64, 0x05); push(GS, 0x56, 0x00); }

  return Buffer.from(lines);
}
