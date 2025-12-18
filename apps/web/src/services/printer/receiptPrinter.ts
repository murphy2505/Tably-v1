import { openEscposNetworkPrinter, safeCut } from "./escposClient";
import { formatReceiptLines, safeLines, type ReceiptItem } from "./receiptFormat";

export type ReceiptPrintPayload = {
  title?: string;
  subtitle?: string;
  headerLines?: string[];

  items?: ReceiptItem[];
  lines?: string[];

  totalLine?: string;
  vatLines?: string[];
  footerLines?: string[];
  cut?: boolean;
  width?: number;
};

function safeText(text: string) {
  return String(text)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/€/g, "EUR");
}

export async function printReceipt(payload: ReceiptPrintPayload): Promise<void> {
  const { device, printer, ip, port } = openEscposNetworkPrinter();
  const width = payload.width ?? 42;

  const bodyLines =
    payload.items?.length
      ? formatReceiptLines(payload.items, width)
      : safeLines(payload.lines || []);

  await new Promise<void>((resolve, reject) => {
    console.log("[printer] opening", ip, port);

    (device as any).open((err: any) => {
      if (err) {
        console.error("[printer] open failed", err);
        return reject(err);
      }
      console.log("[printer] open OK");

      try {
        // ===== HEADER (no chaining to avoid leading "!") =====
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

        printer.close();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}
