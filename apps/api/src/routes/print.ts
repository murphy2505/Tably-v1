import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getTenantIdFromRequest } from "../tenant";

import { printTestReceipt } from "../services/printer/starPrinter";
import { printEpsonTestReceipt } from "../services/printer/epsonPrinter";
import { printEpsonCounterReceipt, printEpsonQrReceipt } from "../services/printer/epsonReceipts";
import { escposTcpTestPrint } from "../services/printer/escposTcp";
import net from "net";

type PrintKind = "RECEIPT" | "QR_CARD" | "KITCHEN" | "BAR";

async function resolvePrinterForKind(tenantId: string, kind: PrintKind) {
  const route = await prisma.printRoute.findUnique({ where: { tenantId_kind: { tenantId, kind } }, include: { printer: true } });
  let p = route?.printer || null;
  if (!p || !p.isActive) {
    p = await prisma.printer.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: "asc" } }) as any;
  }
  if (!p) throw new Error("NO_PRINTER_CONFIGURED");
  return { id: p.id, name: p.name, driver: p.driver as any, host: p.host, port: p.port };
}

function buildEscposReceipt(order: any, driver: "ESC_POS_TCP" | "STAR_ESC_POS_TCP") {
  const ESC = 0x1b; const GS = 0x1d;
  const lines: number[] = [];
  const push = (...nums: number[]) => { lines.push(...nums); };
  const text = (s: string) => { lines.push(...Buffer.from(s, "utf8")); };

  push(ESC, 0x40); // init
  push(ESC, 0x61, 0x01); // center
  push(GS, 0x21, 0x11); text("Tably — Bon\n"); push(GS, 0x21, 0x00);
  push(ESC, 0x61, 0x00); // left

  const label = order.receiptLabel || order.draftLabel || String(order.id).slice(-6);
  text(`Bon: ${label}\n`);
  if (order.createdAt) {
    try { text(`Tijd: ${new Date(order.createdAt).toLocaleString("nl-NL")}\n`); } catch {}
  }
  text("\n");

  const items = (order.lines || []).map((l: any) => ({ title: l.title ?? "Item", qty: Number(l.qty ?? 1), unit: Number(l.priceCents ?? 0) }));
  for (const l of items) {
    const total = l.qty * l.unit;
    text(`${l.qty}x ${l.title}\n`);
    // simple right total by adding spaces, width ~32
    const amt = (total / 100).toFixed(2).replace(".", ",");
    text(`  € ${amt}\n`);
  }
  text("\n");
  const subtotal = typeof order.subtotalExclVatCents === "number" ? order.subtotalExclVatCents : items.reduce((s, l) => s + l.qty * l.unit, 0);
  const vat = typeof order.vatCents === "number" ? order.vatCents : 0;
  const total = typeof order.totalInclVatCents === "number" ? order.totalInclVatCents : subtotal + vat;
  text(`Subtotaal: € ${(subtotal/100).toFixed(2).replace(".", ",")}\n`);
  text(`BTW: € ${(vat/100).toFixed(2).replace(".", ",")}\n`);
  push(GS, 0x21, 0x01); text(`TOTAAL: € ${(total/100).toFixed(2).replace(".", ",")}\n`); push(GS, 0x21, 0x00);
  text("\nBedankt!\n\n");

  if (driver === "STAR_ESC_POS_TCP") { push(ESC, 0x64, 0x03); push(ESC, 0x69); }
  else { push(ESC, 0x64, 0x05); push(GS, 0x56, 0x00); }

  return Buffer.from(lines);
}

async function escposPrint(host: string, port: number, payload: Buffer, driver: "ESC_POS_TCP" | "STAR_ESC_POS_TCP") {
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    let writeOk = false; let settled = false;
    const finish = (err?: any) => { if (settled) return; settled = true; try { socket.end(); } catch {} err ? reject(err) : resolve(); };
    socket.setTimeout(5000);
    socket.once("timeout", () => finish(writeOk ? undefined : new Error("PRINT_TIMEOUT")));
    socket.once("error", (err: any) => { const code = err?.code; if (writeOk && (code === "ECONNRESET" || code === "EPIPE")) return finish(); return finish(err); });
    socket.once("close", () => finish());
    socket.connect(port, host, () => { socket.write(payload, (err) => { if (err) return finish(err); writeOk = true; setTimeout(() => { try { socket.end(); } catch {} }, 100); }); });
  });
}

const router = Router();

// POST /print/test → Star (AUX printer)
router.post("/test", async (_req, res) => {
  try {
    await printTestReceipt();
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.star.test] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/test-escpos → ESC/POS TCP (generic)
router.post("/test-escpos", async (req, res) => {
  try {
    const { host, port } = (req?.body || {}) as { host?: unknown; port?: unknown };
    if (typeof host !== "string" || host.trim() === "") {
      return res.status(400).json({ ok: false, error: "HOST_REQUIRED" });
    }
    const p = Number(port);
    if (!Number.isFinite(p) || p <= 0) {
      return res.status(400).json({ ok: false, error: "PORT_INVALID" });
    }
    await escposTcpTestPrint(host, p);
    res.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[print.test-escpos] error", msg);
    res.status(500).json({ ok: false, error: msg });
  }
});

// POST /print/receipt → resolve route and print order
router.post("/receipt", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const { orderId } = (req.body || {}) as { orderId?: string };
    if (!orderId) return res.status(400).json({ error: { message: "ORDER_ID_REQUIRED" } });
    const order = await prisma.order.findFirst({ where: { id: orderId, tenantId }, include: { lines: true } });
    if (!order) return res.status(404).json({ error: { message: "NOT_FOUND", details: "ORDER_NOT_FOUND" } });
    const printer = await resolvePrinterForKind(tenantId, "RECEIPT");
    console.log(`[print.receipt] tenant=${tenantId} order=${orderId} printer=${printer.name} ${printer.host}:${printer.port} driver=${printer.driver}`);
    // ESC/POS raw for STAR/ESC; use Epson receipt when needed later
    const driver = (printer.driver as any) === "STAR_ESC_POS_TCP" ? "STAR_ESC_POS_TCP" : "ESC_POS_TCP";
    const payload = buildEscposReceipt(order as any, driver);
    await escposPrint(printer.host, printer.port, payload, driver);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.receipt] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/receipt/last → print latest PAID/COMPLETED order
router.post("/receipt/last", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const ord = await prisma.order.findFirst({ where: { tenantId, status: { in: ["PAID", "COMPLETED"] } as any }, orderBy: { updatedAt: "desc" }, include: { lines: true } });
    if (!ord) return res.status(404).json({ error: { message: "NO_PAID_ORDER" } });
    const printer = await resolvePrinterForKind(tenantId, "RECEIPT");
    console.log(`[print.receipt.last] tenant=${tenantId} order=${ord.id} printer=${printer.name} ${printer.host}:${printer.port} driver=${printer.driver}`);
    const driver = (printer.driver as any) === "STAR_ESC_POS_TCP" ? "STAR_ESC_POS_TCP" : "ESC_POS_TCP";
    const payload = buildEscposReceipt(ord as any, driver);
    await escposPrint(printer.host, printer.port, payload, driver);
    res.json({ ok: true, orderId: ord.id });
  } catch (e: any) {
    console.error("[print.receipt.last] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/test-kind → route-based test
router.post("/test-kind", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const { kind } = (req.body || {}) as { kind?: PrintKind };
    if (!kind) return res.status(400).json({ error: { message: "KIND_REQUIRED" } });
    const printer = await resolvePrinterForKind(tenantId, kind);
    const drv = (printer.driver as any) === "STAR_ESC_POS_TCP" ? "STAR_ESC_POS_TCP" : "ESC_POS_TCP";
    console.log(`[print.test-kind] tenant=${tenantId} kind=${kind} printer=${printer.name} ${printer.host}:${printer.port} driver=${printer.driver}`);
    await escposTcpTestPrint(printer.host, printer.port, drv as any);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.test-kind] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/epson/test → Epson (MAIN printer)
router.post("/epson/test", async (_req, res) => {
  try {
    await printEpsonTestReceipt();
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.epson.test] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/epson/counter → Epson baliebon (body optioneel)
router.post("/epson/counter", async (req, res) => {
  try {
    const ip = req.body?.ip || "192.168.2.168";

    await printEpsonCounterReceipt(ip, {
      businessName: "Cafetaria ’t Centrum",
      addressLine: "Groesbeek",
      orderNo: req.body?.orderNo ?? "DEMO-001",
      createdAtIso: new Date().toISOString(),
      lines: req.body?.lines ?? [
        { qty: 1, title: "Friet Middel", unitPriceCents: 325 },
        { qty: 1, title: "Frikandel", unitPriceCents: 245 },
      ],
      subtotalCents: req.body?.subtotalCents ?? 570,
      vatCents: req.body?.vatCents ?? 99,
      totalCents: req.body?.totalCents ?? 669,
      paidWith: req.body?.paidWith ?? "PIN",
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.epson.counter] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/epson/qr → Epson QR/klantenkaart ticket
router.post("/epson/qr", async (req, res) => {
  try {
    const ip = req.body?.ip || "192.168.2.168";
    const qrText = String(req.body?.qrText || "");

    await printEpsonQrReceipt(ip, {
      businessName: "Cafetaria ’t Centrum",
      title: req.body?.title ?? "Klantenkaart",
      subtitle: req.body?.subtitle ?? "Scan deze QR om te koppelen",
      qrText: qrText || "tably://loyalty/demo",
      footer: req.body?.footer ?? "Bewaar deze bon of maak een foto",
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.epson.qr] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/order/:orderId → print echte order (Epson counter)
router.post("/order/:orderId", async (req, res) => {
  try {
    const orderId = String(req.params.orderId);
    const ip = req.body?.ip || "192.168.2.168";

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true }, // <- FIX: geen product/variant relations
    });

    if (!order) {
      return res.status(404).json({ error: { message: "NOT_FOUND", details: "ORDER_NOT_FOUND" } });
    }

    const receiptLines = (order as any).lines.map((l: any) => {
      const title = l.title ?? l.name ?? l.productName ?? "Item";
      const unitPriceCents = Number(l.unitPriceCents ?? l.priceCents ?? l.unitPrice ?? 0);
      const qty = Number(l.qty ?? l.quantity ?? 1);
      return { qty, title, unitPriceCents };
    });

    const subtotalCents =
      typeof (order as any).subtotalCents === "number"
        ? (order as any).subtotalCents
        : receiptLines.reduce((sum: number, it: any) => sum + it.qty * it.unitPriceCents, 0);

    const vatCents =
      typeof (order as any).vatCents === "number" ? (order as any).vatCents : 0;

    const totalCents =
      typeof (order as any).totalCents === "number" ? (order as any).totalCents : subtotalCents + vatCents;

    await printEpsonCounterReceipt(ip, {
      businessName: "Cafetaria ’t Centrum",
      addressLine: "Groesbeek",
      orderNo: (order as any).receiptLabel ?? (order as any).receiptNo ?? (order as any).number ?? String(order.id).slice(-6),
      createdAtIso: (order as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
      lines: receiptLines,
      subtotalCents,
      vatCents,
      totalCents,
      paidWith: (order as any).paidWith ?? (order as any).paymentMethod ?? "PIN",
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.order] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

export default router;
