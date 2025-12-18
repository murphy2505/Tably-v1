import { openEscposNetworkPrinter, safeCut } from "./escposClient";
import { formatReceiptLines, safeLines, type ReceiptItem } from "./receiptFormat";
import { printReceiptStarIo10, type ReceiptPrintPayload as StarPayload } from "./starIo10Printer";

export type ReceiptPrintPayload = {
  title?: string;
  subtitle?: string;
  headerLines?: string[];

  items?: ReceiptItem[];   // voorkeur
  lines?: string[];        // fallback

  totalLine?: string;
  vatLines?: string[];
  footerLines?: string[];
  cut?: boolean;
  width?: number;          // default 42
};

function safeText(text: string) {
  return String(text)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/€/g, "EUR");
}

function escposReset(printer: any) {
  // ESC @ → reset printer modes (fixes leading "!")
  printer.raw(Buffer.from([0x1b, 0x40]));
}

export async function printReceipt(payload: ReceiptPrintPayload): Promise<void> {
  if ((process.env.PRINTER_STAR_MODE || "ESCPOS").toUpperCase() === "STARPRNT") {
    console.log("[printer] mode=STARPRNT (receipt)");
    return printReceiptStarIo10(payload as unknown as StarPayload);
  }
  console.log("[printer] mode=ESCPOS (receipt)");
  const { device, printer, ip, port } = openEscposNetworkPrinter();
  const width = payload.width ?? 42;

  const bodyLines =
    payload.items?.length
      ? formatReceiptLines(payload.items, width)
      : safeLines(payload.lines || []);

  await new Promise<void>((resolve, reject) => {
    console.log("[printer] opening", ip, port);

    device.open((err: unknown) => {
      if (err) {
        console.error("[printer] open failed", err);
        return reject(err);
      }

      console.log("[printer] open OK");

      try {
        // ===== RESET / HEADER =====
        escposReset(printer);
        printer.align("CT");

        if (payload.title) {
          printer.style("B");
          printer.size(1, 1);
          printer.text(safeText(payload.title));
        }

        if (payload.subtitle) {
          printer.style("NORMAL");
          printer.size(0, 0);
          printer.text(safeText(payload.subtitle));
        }

        if (payload.title || payload.subtitle) {
          printer.drawLine();
        }

        // ===== META HEADER =====
        if (payload.headerLines?.length) {
          printer.align("LT");
          printer.style("NORMAL");
          payload.headerLines.forEach((l) => printer.text(safeText(l)));
          printer.drawLine();
        }

        // ===== BODY =====
        printer.align("LT");
        printer.style("NORMAL");
        bodyLines.forEach((l) => printer.text(l));

        printer.drawLine();

        // ===== TOTAL / VAT =====
        if (payload.totalLine) {
          printer.style("B");
          printer.text(safeText(payload.totalLine));
        }

        if (payload.vatLines?.length) {
          printer.style("NORMAL");
          payload.vatLines.forEach((l) => printer.text(safeText(l)));
        }

        printer.drawLine();

        // ===== FOOTER =====
        if (payload.footerLines?.length) {
          printer.align("CT");
          printer.style("NORMAL");
          payload.footerLines.forEach((l) => printer.text(safeText(l)));
        }

        // ===== CUT =====
        if (payload.cut !== false) {
          safeCut(printer);
        }

        setTimeout(() => {
          try { printer.close(); } catch {}
          resolve();
        }, 150);
      } catch (e) {
        reject(e);
      }
    });
  });
}
