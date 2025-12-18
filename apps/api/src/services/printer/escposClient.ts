/* eslint-disable @typescript-eslint/no-var-requires */

export type EscposDevice = any;
export type EscposPrinter = any;

export function getPrinterConfig() {
  const ip = process.env.PRINTER_STAR_IP || "192.168.2.13";
  const port = Number(process.env.PRINTER_STAR_PORT || "9100");
  return { ip, port };
}

export function openEscposNetworkPrinter(): {
  device: EscposDevice;
  printer: EscposPrinter;
  ip: string;
  port: number;
} {
  const escpos = require("escpos");
  const Network = require("escpos-network");
  escpos.Network = Network;

  const { ip, port } = getPrinterConfig();
  const device: EscposDevice = new escpos.Network(ip, port);
  const printer: EscposPrinter = new escpos.Printer(device, { encoding: "CP858" });

  return { device, printer, ip, port };
}

/**
 * One cutter function for the whole codebase.
 * Never throws; tries best available method then raw fallback.
 */
export function safeCut(printer: any) {
  try {
    if (typeof printer.feed === "function") printer.feed(1);
    if (typeof printer.cut === "function") {
      // Try both partial and full cut forms some drivers expose (ESC/POS)
      try { printer.cut(true); } catch {}
      try { printer.cut(false); } catch {}
      return;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof printer.raw !== "function") return;

    // Feed a few lines: ESC d n (minimize paper)
    printer.raw(Buffer.from([0x1b, 0x64, 0x01]));

    // Star-specific cut variants first (common for mC-Print series)
    printer.raw(Buffer.from([0x1b, 0x69])); // ESC i (full cut)

    // Epson/ESC-POS cut variants
    printer.raw(Buffer.from([0x1d, 0x56, 0x42, 0x00])); // GS V B 0 (full cut)
    printer.raw(Buffer.from([0x1d, 0x56, 0x00])); // GS V 0  (full cut)
    printer.raw(Buffer.from([0x1d, 0x56, 0x41, 0x00])); // GS V A 0 (full cut with feed 0)

    // Star partial after full attempts
    printer.raw(Buffer.from([0x1b, 0x6d])); // ESC m (partial cut)

    // Additional partial variants
    printer.raw(Buffer.from([0x1d, 0x56, 0x01])); // GS V 1  (partial cut)
    printer.raw(Buffer.from([0x1d, 0x56, 0x42, 0x01])); // GS V B 1 (partial)
    printer.raw(Buffer.from([0x1d, 0x56, 0x41, 0x02])); // GS V A 2 (partial cut with feed 2)
  } catch {
    // swallow
  }
}
