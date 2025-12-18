import escpos from "escpos";
import Network from "escpos-network";

escpos.Network = Network;

type ReceiptLine = {
  qty?: number;
  title: string;
  priceCents?: number;
};

type ReceiptData = {
  businessName: string;
  address?: string;
  orderNo: string;
  lines: ReceiptLine[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  paidWith?: string;
};

const euro = (cents: number) =>
  `€ ${(cents / 100).toFixed(2).replace(".", ",")}`;

export async function printEpsonReceipt(
  printerIp: string,
  data: ReceiptData
) {
  const device = new escpos.Network(printerIp);
  const printer = new escpos.Printer(device, { encoding: "CP858" });

  return new Promise<void>((resolve, reject) => {
    device.open((err) => {
      if (err) return reject(err);

      printer
        .align("CT")
        .style("B")
        .size(1, 1)
        .text(data.businessName)
        .size(0, 0)
        .style("NORMAL");

      if (data.address) {
        printer.text(data.address);
      }

      printer
        .text("------------------------------")
        .align("LT")
        .text(`Bon: ${data.orderNo}`)
        .text("");

      // ITEMS
      data.lines.forEach((l) => {
        const qty = l.qty ? `${l.qty}x ` : "";
        const price = l.priceCents ? euro(l.priceCents) : "";
        printer.tableCustom([
          { text: qty + l.title, align: "LEFT", width: 0.7 },
          { text: price, align: "RIGHT", width: 0.3 },
        ]);
      });

      printer
        .text("------------------------------")
        .tableCustom([
          { text: "Subtotaal", align: "LEFT", width: 0.7 },
          { text: euro(data.subtotalCents), align: "RIGHT", width: 0.3 },
        ])
        .tableCustom([
          { text: "BTW", align: "LEFT", width: 0.7 },
          { text: euro(data.vatCents), align: "RIGHT", width: 0.3 },
        ])
        .style("B")
        .tableCustom([
          { text: "TOTAAL", align: "LEFT", width: 0.7 },
          { text: euro(data.totalCents), align: "RIGHT", width: 0.3 },
        ])
        .style("NORMAL")
        .text("")
        .align("CT")
        .text(`Betaald met: ${data.paidWith ?? "PIN"}`)
        .text("")
        .text("Bedankt voor uw bezoek!")
        .text("")
        .cut()
        .close();

      resolve();
    });
  });
}
