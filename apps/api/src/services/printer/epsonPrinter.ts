/* eslint-disable @typescript-eslint/no-var-requires */

type EscposDevice = any;
type EscposPrinter = any;

function getPrinterConfig() {
  const ip = "192.168.2.168"; // Epson TM-T20II
  const port = 9100;
  return { ip, port };
}

export async function printEpsonTestReceipt(): Promise<void> {
  const escpos = require("escpos");
  const Network = require("escpos-network");
  escpos.Network = Network;

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
          .style("NORMAL")
          .size(0, 0)
          .text("Epson TM-T20II")
          .drawLine()
          .align("LT")
          .text("Testbon hoofdprinter")
          .text(new Date().toLocaleString("nl-NL"))
          .drawLine()
          .text("Epson werkt stabiel")
          .drawLine();

        // Epson cut (native ESC/POS)
        printer.feed(3);
        printer.cut();

        printer.close();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}
