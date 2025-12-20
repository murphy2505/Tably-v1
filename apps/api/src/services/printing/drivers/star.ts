import { printTestStarIo10, printReceiptStarIo10, type ReceiptPrintPayload } from "../../printer/starIo10Printer";
import { type PrinterLike } from "../index";

function setStarEnvFromPrinter(printer: PrinterLike) {
  if (printer?.host) {
    process.env.PRINTER_STAR_IP = String(printer.host);
  }
  if (printer?.port) {
    process.env.PRINTER_STAR_PORT = String(printer.port);
  }
}

export async function printStarTest(printer: PrinterLike): Promise<void> {
  const host = printer.host;
  const port = Number(printer.port || 9100);
  console.log("[print][STAR] start", { name: printer.name, host, port });
  try {
    setStarEnvFromPrinter(printer);
    await printTestStarIo10();
    console.log("[print][STAR] done");
  } catch (err: any) {
    console.error("[print][STAR] error", err);
    throw err;
  }
}

export async function printStarReceipt(printer: PrinterLike, payload: { order: any }): Promise<void> {
  const host = printer.host;
  const port = Number(printer.port || 9100);
  console.log("[print][STAR] start", { name: printer.name, host, port });
  try {
    setStarEnvFromPrinter(printer);
    const order = payload?.order || {};
    const label = order?.receiptLabel || order?.draftLabel || String(order?.id || "").slice(-6);
    const headerLines: string[] = [];
    if (label) headerLines.push(`Bon: ${label}`);
    if (order?.createdAt) {
      try { headerLines.push(`Tijd: ${new Date(order.createdAt).toLocaleString("nl-NL")}`); } catch {}
    }

    const items = (order?.lines || []).map((l: any) => ({
      qty: Number(l.qty ?? 1),
      name: String(l.title ?? "Item"),
      priceCents: Number((l.priceCents ?? 0) * Number(l.qty ?? 1)),
    }));

    const subtotal = typeof order?.subtotalExclVatCents === "number"
      ? Number(order.subtotalExclVatCents)
      : items.reduce((s: number, it: any) => s + Number(it.priceCents || 0), 0);
    const vat = typeof order?.vatCents === "number" ? Number(order.vatCents) : 0;
    const total = typeof order?.totalInclVatCents === "number" ? Number(order.totalInclVatCents) : subtotal + vat;

    const vatLines: string[] = [];
    vatLines.push(`BTW: ${(vat / 100).toFixed(2).replace(".", ",")} EUR`);

    const payloadStar: ReceiptPrintPayload = {
      title: "Tably — Bon",
      headerLines,
      items,
      totalLine: `TOTAAL: ${(total / 100).toFixed(2).replace(".", ",")} EUR`,
      vatLines,
      footerLines: ["Bedankt!"],
      cut: true,
      width: 42, // 80mm
    };

    await printReceiptStarIo10(payloadStar);
    console.log("[print][STAR] done");
  } catch (err: any) {
    console.error("[print][STAR] error", err);
    throw err;
  }
}
