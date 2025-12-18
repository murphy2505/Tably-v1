/* eslint-disable @typescript-eslint/no-var-requires */

type EscposDevice = any;
type EscposPrinter = any;

function getPrinterConfig() {
  const ip = process.env.PRINTER_STAR_IP || "192.168.2.13";
  const port = Number(process.env.PRINTER_STAR_PORT || "9100");
  return { ip, port };
}

export async function printTestReceipt(): Promise<void> {
  const escpos = require("escpos");
  const Network = require("escpos-network");
  escpos.Network = Network; // ✅ THIS FIXES "not a constructor"

  const { ip, port } = getPrinterConfig();

  const device: EscposDevice = new escpos.Network(ip, port);
  const printer: EscposPrinter = new escpos.Printer(device, { encoding: "CP858" });

  await new Promise<void>((resolve, reject) => {
    device.open((err: any) => {
      if (err) return reject(err);

      try {
        printer
          .align("CT")
          .style("B")
          .size(1, 1)
          .text("Tably POS")
          .text("Printer test")
          .drawLine()
          .align("LT")
          .text("Star M3 - LAN")
          .text(new Date().toLocaleString("nl-NL"))
          .drawLine();

        // cut (fallbacks)
        try { printer.feed(3); } catch {}
        try { printer.cut(true); } catch {}
        try {
          if (typeof printer.raw === "function") {
            printer.raw(Buffer.from([0x1b, 0x64, 0x03]));       // ESC d 3
            printer.raw(Buffer.from([0x1d, 0x56, 0x00]));       // GS V 0
            printer.raw(Buffer.from([0x1d, 0x56, 0x01]));       // GS V 1
            printer.raw(Buffer.from([0x1d, 0x56, 0x41, 0x03])); // GS V A 3
          }
        } catch {}

        printer.close();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}
