/* eslint-disable @typescript-eslint/no-var-requires */

type Any = any;

function safeText(text: string) {
  return String(text).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/€/g, "EUR");
}

function getPrinterConfig() {
  const ip = process.env.PRINTER_STAR_IP || "192.168.2.13";
  return { ip };
}

function loadStarIo10(): Any {
  try {
    // Prefer local install in app workspace
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("@starmicronics/stario10");
  } catch (e) {
    throw new Error("STARPRNT_SDK_NOT_INSTALLED: please `npm -w apps/api i @starmicronics/stario10`");
  }
}

export async function printTestStarIo10(): Promise<void> {
  const star = loadStarIo10();
  const { ip } = getPrinterConfig();

  const settings = new star.StarConnectionSettings();
  settings.interfaceType = "LAN";
  settings.identifier = ip;

  const printer = new star.StarPrinter(settings);

  const builder = new star.StarXpandCommand.StarXpandCommandBuilder();
  const document = new star.StarXpandCommand.DocumentBuilder();
  const p = new star.StarXpandCommand.PrinterBuilder();

  console.log("[printer] StarIO10 test mode ->", ip);

  p.styleAlignment(star.StarXpandCommand.Printer.Alignment.Center)
    .styleBold(true)
    .addText(safeText("Tably POS") + "\n")
    .styleBold(false)
    .addText(safeText("Printer test") + "\n")
    .addText("------------------------------------------\n")
    .styleAlignment(star.StarXpandCommand.Printer.Alignment.Left)
    .addText(safeText("Star mC-Print3 (StarPRNT)") + "\n")
    .addText(safeText(new Date().toLocaleString("nl-NL")) + "\n")
    .addText("------------------------------------------\n")
    .addFeed(3)
    .actionCut(star.StarXpandCommand.Printer.CutType.Partial)
    .actionCut(star.StarXpandCommand.Printer.CutType.Full);

  document.addPrinter(p);
  builder.addDocument(document);
  const commands = await builder.getCommands();

  await printer.open();
  try {
    await printer.print(commands);
    await new Promise((r) => setTimeout(r, 300));
  } finally {
    await printer.close();
  }
}

export type ReceiptItem = { qty: number; name: string; priceCents?: number };
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

export async function printReceiptStarIo10(payload: ReceiptPrintPayload): Promise<void> {
  const star = loadStarIo10();
  const { ip } = getPrinterConfig();

  const settings = new star.StarConnectionSettings();
  settings.interfaceType = "LAN";
  settings.identifier = ip;

  const printer = new star.StarPrinter(settings);

  const builder = new star.StarXpandCommand.StarXpandCommandBuilder();
  const document = new star.StarXpandCommand.DocumentBuilder();
  const p = new star.StarXpandCommand.PrinterBuilder();

  console.log("[printer] StarIO10 receipt mode ->", ip);

  // Header
  p.styleAlignment(star.StarXpandCommand.Printer.Alignment.Center);
  if (payload.title) {
    p.styleBold(true).addText(safeText(payload.title) + "\n").styleBold(false);
  }
  if (payload.subtitle) {
    p.addText(safeText(payload.subtitle) + "\n");
  }
  if (payload.title || payload.subtitle) p.addText("------------------------------------------\n");

  // Meta header
  if (payload.headerLines?.length) {
    p.styleAlignment(star.StarXpandCommand.Printer.Alignment.Left);
    for (const l of payload.headerLines) p.addText(safeText(l) + "\n");
    p.addText("------------------------------------------\n");
  }

  // Body lines
  p.styleAlignment(star.StarXpandCommand.Printer.Alignment.Left);
  const width = payload.width ?? 42;
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length > 0) {
    for (const it of items) {
      const left = `${it.qty} ${safeText(it.name)}`;
      const right = it.priceCents != null ? `${(it.priceCents / 100).toFixed(2).replace(".", ",")} EUR` : "";
      const space = Math.max(1, width - left.length - right.length);
      p.addText(left + " ".repeat(space) + right + "\n");
    }
  } else if (payload.lines?.length) {
    for (const l of payload.lines) p.addText(safeText(l) + "\n");
  }
  p.addText("------------------------------------------\n");

  // Totals / VAT
  if (payload.totalLine) p.styleBold(true).addText(safeText(payload.totalLine) + "\n").styleBold(false);
  if (payload.vatLines?.length) for (const l of payload.vatLines) p.addText(safeText(l) + "\n");
  p.addText("------------------------------------------\n");

  // Footer
  if (payload.footerLines?.length) {
    p.styleAlignment(star.StarXpandCommand.Printer.Alignment.Center);
    for (const l of payload.footerLines) p.addText(safeText(l) + "\n");
  }

  if (payload.cut !== false) {
    p.addFeed(3)
      .actionCut(star.StarXpandCommand.Printer.CutType.Partial)
      .actionCut(star.StarXpandCommand.Printer.CutType.Full);
  }

  document.addPrinter(p);
  builder.addDocument(document);
  const commands = await builder.getCommands();

  await printer.open();
  try {
    await printer.print(commands);
    await new Promise((r) => setTimeout(r, 300));
  } finally {
    await printer.close();
  }
}
