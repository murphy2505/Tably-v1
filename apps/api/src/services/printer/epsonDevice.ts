import escpos from "escpos";
import Network from "escpos-network";

escpos.Network = Network;

export function openEpson(printerIp: string) {
  const device = new escpos.Network(printerIp);
  const printer = new escpos.Printer(device, { encoding: "CP858" });

  const open = () =>
    new Promise<{ device: any; printer: any }>((resolve, reject) => {
      device.open((err: any) => {
        if (err) return reject(err);
        resolve({ device, printer });
      });
    });

  return { open };
}

// escpos qrcode is callback-based; wrap it
export function printQr(printer: any, text: string) {
  try {
    if (typeof printer.qrcode === "function") {
      printer.qrcode(text, { size: 6 });
    } else {
      printer.align("CT").text(text);
    }
  } catch {
    printer.align("CT").text(text);
  }
}


export const euro = (cents: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
