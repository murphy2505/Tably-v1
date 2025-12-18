import { openEpson, euro } from "./epsonDevice";
import { printQrAsImage } from "./epsonQrBitmap";

export type ReceiptLine = {
  qty: number;
  title: string;
  unitPriceCents: number;
};

export type CounterReceipt = {
  businessName: string;
  addressLine?: string;
  orderNo: string;
  createdAtIso?: string;
  lines: ReceiptLine[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  paidWith?: string;
};

export type QrReceipt = {
  businessName: string;
  title?: string;
  subtitle?: string;
  qrText: string;
  footer?: string;
};

export async function printEpsonCounterReceipt(printerIp: string, data: CounterReceipt) {
  const { open } = openEpson(printerIp);
  const { printer } = await open();

  printer.align("CT").style("B").size(1, 1).text(data.businessName).size(0, 0).style("NORMAL");
  if (data.addressLine) printer.text(data.addressLine);

  printer.text("--------------------------------").align("LT").text(`Bon: ${data.orderNo}`);

  if (data.createdAtIso) {
    const d = new Date(data.createdAtIso);
    printer.text(`Tijd: ${d.toLocaleString("nl-NL")}`);
  }

  printer.text("");

  for (const l of data.lines) {
    printer.tableCustom([
      { text: `${l.qty}x ${l.title}`, align: "LEFT", width: 0.72 },
      { text: euro(l.qty * l.unitPriceCents), align: "RIGHT", width: 0.28 },
    ]);
  }

  printer
    .text("--------------------------------")
    .tableCustom([{ text: "Subtotaal", align: "LEFT", width: 0.7 }, { text: euro(data.subtotalCents), align: "RIGHT", width: 0.3 }])
    .tableCustom([{ text: "BTW", align: "LEFT", width: 0.7 }, { text: euro(data.vatCents), align: "RIGHT", width: 0.3 }])
    .style("B")
    .tableCustom([{ text: "TOTAAL", align: "LEFT", width: 0.7 }, { text: euro(data.totalCents), align: "RIGHT", width: 0.3 }])
    .style("NORMAL")
    .text("")
    .align("CT");

  if (data.paidWith) printer.text(`Betaald met: ${data.paidWith}`);

  printer.text("").text("Bedankt voor uw bezoek!").text("").cut().close();
}

export async function printEpsonQrReceipt(printerIp: string, data: QrReceipt) {
  const { open } = openEpson(printerIp);
  const { printer } = await open();

  printer.align("CT").style("B").text(data.businessName).style("NORMAL");
  if (data.title) printer.text(data.title);

  if (data.subtitle) {
    printer.text("").text(data.subtitle);
  }

  printer.text("--------------------------------");

  // QR as bitmap (Epson-safe)
  printer.text("");
  await printQrAsImage(printer, data.qrText);
  printer.text("");

  if (data.footer) {
    printer.text("--------------------------------").text(data.footer);
  } else {
    printer.text("Scan om te koppelen / sparen");
  }

  printer.text("").cut().close();
}
