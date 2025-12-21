import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getTenantIdFromRequest } from "../tenant";

import { printTest, printToPrinter } from "../services/printing";
import { printStarTestReceipt, starCutTest, starDrawerTest } from "../services/printer/starEscposNetwork";
import { printEpsonTestReceipt } from "../services/printer/epsonPrinter";
import { printEpsonCounterReceipt, printEpsonQrReceipt } from "../services/printer/epsonReceipts";
import net from "net";

type PrintKind = "RECEIPT" | "QR_CARD" | "KITCHEN" | "BAR";

async function resolvePrinterForKind(tenantId: string, kind: PrintKind) {
  const route = await prisma.printRoute.findUnique({ where: { tenantId_kind: { tenantId, kind } }, include: { printer: true } });
  let p = route?.printer || null;
  if (!p || !p.isActive) {
    p = await prisma.printer.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: "asc" } }) as any;
  }
  if (!p) throw new Error("NO_PRINTER_CONFIGURED");
  // STAR driver fallback: use env defaults for IP/port and route via ESC/POS TCP
  const drv = String(p.driver || "");
  if (drv.startsWith("STAR")) {
    const ip = p.host || process.env.STAR_PRINTER_IP || "192.168.2.13";
    const port = Number(p.port || process.env.STAR_PRINTER_PORT || 9100);
    if (!ip || !Number.isFinite(port)) {
      const err = new Error("STAR_PRINTER_IP_REQUIRED");
      (err as any).status = 400;
      throw err;
    }
    console.log("[printer.star] route", { tenantId, kind, ip, port, driver: "STAR_ESC_POS_TCP" });
    return { id: p.id, name: p.name, driver: "STAR_ESC_POS_TCP" as any, host: ip, port };
  }
  return { id: p.id, name: p.name, driver: p.driver as any, host: p.host, port: p.port };
}

// ESC/POS receipt builder moved to services/printing/index.ts

// Raw TCP ESC/POS moved under printing driver

const router = Router();

// Helper: uniform error mapping for printer failures
function respondPrintError(res: any, e: any) {
  const msg = e?.message || String(e);
  const code = (e && (e.code || e.errno)) || undefined;
  let status = 500;
  let error = "PRINT_FAILED";
  if (msg === "NO_PRINTER_CONFIGURED") { status = 400; error = "NO_PRINTER_CONFIGURED"; }
  else if (/PRINTER_TIMEOUT|PRINT_TIMEOUT/i.test(msg)) { status = 504; error = "PRINTER_TIMEOUT"; }
  else if (msg.startsWith("DRIVER_NOT_IMPLEMENTED") || msg.startsWith("JOB_NOT_SUPPORTED")) { status = 501; error = msg.split(":")[0]; }
  else if (/STARPRNT_SDK_NOT_INSTALLED/.test(msg)) { status = 501; error = "STAR_SDK_NOT_INSTALLED"; }
  else if (code === "ECONNREFUSED") { status = 502; error = "PRINTER_CONNECTION_REFUSED"; }
  else if (code === "EHOSTUNREACH" || code === "ENETUNREACH") { status = 502; error = "PRINTER_UNREACHABLE"; }
  const details = { message: msg, code };
  return res.status(status).json({ error: { message: error, details } });
}

// POST /print/test → route to driver based on a default active printer (RECEIPT)
router.post("/test", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const printer = await resolvePrinterForKind(tenantId, "RECEIPT");
    if (String(printer.driver).startsWith("STAR")) {
      await printStarTestReceipt(tenantId);
    } else {
      await printTest(printer as any);
    }
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.test] error", e);
    return respondPrintError(res, e);
  }
});

// Optional: direct STAR test endpoint using env IP/port
router.post("/star/test", async (req, res) => {
  try {
    const ip = process.env.STAR_PRINTER_IP || "192.168.2.13";
    const port = Number(process.env.STAR_PRINTER_PORT || 9100);
    if (!ip || !Number.isFinite(port)) {
      return res.status(400).json({ error: { message: "VALIDATION_ERROR", details: "STAR_PRINTER_IP_REQUIRED" } });
    }
    const tenantId = getTenantIdFromRequest(req);
    await printStarTestReceipt(tenantId);
    const feedBeforeCut = Number(process.env.STAR_FEED_BEFORE_CUT || 3);
    const cutMode = String(process.env.STAR_CUT_MODE || "full").toLowerCase();
    const drawerEnabled = /^(true|1|yes)$/i.test(String(process.env.STAR_DRAWER_ENABLED ?? "true"));
    const drawerPin = Number(process.env.STAR_DRAWER_PIN || 2);
    res.json({ ok: true, used: "STAR_ESC_POS_NETWORK", settings: { ip, port, feedBeforeCut, cutMode, drawerEnabled, drawerPin } });
  } catch (e: any) {
    console.error("[printer.star.test] error", e);
    return respondPrintError(res, e);
  }
});

router.post("/star/cut-test", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    await starCutTest(tenantId);
    const ip = process.env.STAR_PRINTER_IP || "192.168.2.13";
    const port = Number(process.env.STAR_PRINTER_PORT || 9100);
    const feedBeforeCut = Number(process.env.STAR_FEED_BEFORE_CUT || 3);
    const cutMode = String(process.env.STAR_CUT_MODE || "full").toLowerCase();
    res.json({ ok: true, used: "STAR_ESC_POS_NETWORK", settings: { ip, port, feedBeforeCut, cutMode } });
  } catch (e: any) {
    console.error("[printer.star.cut-test] error", e);
    return respondPrintError(res, e);
  }
});

router.post("/star/drawer-test", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    await starDrawerTest(tenantId);
    const ip = process.env.STAR_PRINTER_IP || "192.168.2.13";
    const port = Number(process.env.STAR_PRINTER_PORT || 9100);
    const drawerEnabled = /^(true|1|yes)$/i.test(String(process.env.STAR_DRAWER_ENABLED ?? "true"));
    const drawerPin = Number(process.env.STAR_DRAWER_PIN || 2);
    res.json({ ok: true, used: "STAR_ESC_POS_NETWORK", settings: { ip, port, drawerEnabled, drawerPin } });
  } catch (e: any) {
    console.error("[printer.star.drawer-test] error", e);
    return respondPrintError(res, e);
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
    // Use driver directly for explicit ESC/POS test
    await printTest({ id: "ad-hoc", name: "ESC/POS", driver: "ESC_POS_TCP", host, port: p } as any);
    res.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[print.test-escpos] error", msg);
    return respondPrintError(res, e);
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
    await printToPrinter(printer as any, { kind: "RECEIPT", payload: { order } });
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.receipt] error", e);
    return respondPrintError(res, e);
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
    await printToPrinter(printer as any, { kind: "RECEIPT", payload: { order: ord } });
    res.json({ ok: true, orderId: ord.id });
  } catch (e: any) {
    console.error("[print.receipt.last] error", e);
    return respondPrintError(res, e);
  }
});

// POST /print/test-kind → route-based test
router.post("/test-kind", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const { kind } = (req.body || {}) as { kind?: PrintKind };
    if (!kind) return res.status(400).json({ error: { message: "KIND_REQUIRED" } });
    const printer = await resolvePrinterForKind(tenantId, kind);
    console.log(`[print.test-kind] tenant=${tenantId} kind=${kind} printer=${printer.name} ${printer.host}:${printer.port} driver=${printer.driver}`);
    await printTest(printer as any);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.test-kind] error", e);
    return respondPrintError(res, e);
  }
});

// POST /print/epson/test → Epson (MAIN printer)
router.post("/epson/test", async (_req, res) => {
  try {
    await printEpsonTestReceipt();
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.epson.test] error", e);
    return respondPrintError(res, e);
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
    return respondPrintError(res, e);
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
    return respondPrintError(res, e);
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
    return respondPrintError(res, e);
  }
});

export default router;
