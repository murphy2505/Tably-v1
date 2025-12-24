import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler, validationError } from "../../lib/http";
import { z } from "zod";
import { printTest, printToPrinter } from "../../services/printing";
import { buildReceipt80, buildTestCut, buildDrawerPulse } from "../../services/printer/receiptTemplate";
import { sendEscposTcpRaw } from "../../services/printing/drivers/escposTcp";
import { getTenantIdFromRequest } from "../../tenant";

export const settingsRouter = Router();

// Get receipt settings
settingsRouter.get("/core/settings/receipt", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const settings = await prisma.tenantSettings.findFirst({ where: { tenantId } });
  return res.json({ settings: { receiptPrefix: settings?.receiptPrefix ?? null } });
}));

// Update receipt settings
settingsRouter.put("/core/settings/receipt", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const Body = z.object({ receiptPrefix: z.string().max(16).nullable().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { receiptPrefix = null } = parsed.data;

  const updated = await prisma.tenantSettings.upsert({
    where: { tenantId },
    update: { receiptPrefix: receiptPrefix ?? null },
    create: { tenantId, openingHours: {}, closures: {}, webshopEnabled: true, webshopTimezone: "Europe/Amsterdam", receiptPrefix: receiptPrefix ?? null },
  });
  return res.json({ settings: { receiptPrefix: updated.receiptPrefix ?? null } });
}));

// =========================
// POS settings (auto-print after payment)
// =========================
settingsRouter.get("/core/settings/pos", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const s = await prisma.tenantSettings.findFirst({ where: { tenantId } });
  const autoPrint = s?.autoPrintReceiptAfterPayment ?? true;
  return res.json({ settings: { autoPrintReceiptAfterPayment: autoPrint } });
}));

settingsRouter.put("/core/settings/pos", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const Body = z.object({ autoPrintReceiptAfterPayment: z.boolean() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { autoPrintReceiptAfterPayment } = parsed.data;

  const updated = await prisma.tenantSettings.upsert({
    where: { tenantId },
    update: { autoPrintReceiptAfterPayment },
    create: {
      tenantId,
      openingHours: {},
      closures: {},
      webshopEnabled: true,
      webshopTimezone: "Europe/Amsterdam",
      autoPrintReceiptAfterPayment,
    },
  });
  return res.json({ settings: { autoPrintReceiptAfterPayment: updated.autoPrintReceiptAfterPayment } });
}));

// =========================
// Printers CRUD
// =========================
const PrinterBody = z.object({
  name: z.string().min(1),
  driver: z.enum(["ESC_POS_TCP", "STAR_ESC_POS_TCP", "EPOS_HTTP", "STARPRNT"]),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(9100),
  httpUrl: z.string().url().optional(),
  paperWidth: z.union([z.literal(80), z.literal(58)]).default(80),
  isActive: z.boolean().default(true),
});

settingsRouter.get("/core/printers", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  let items = await prisma.printer.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  // Seed two LAN printers for dev when tenant has none
  if (items.length === 0) {
    try {
      const star = await prisma.printer.create({ data: { tenantId, name: "Star", driver: "STAR_ESC_POS_TCP" as any, host: process.env.STAR_PRINTER_IP || "192.168.2.13", port: Number(process.env.STAR_PRINTER_PORT || 9100), paperWidth: 80, isActive: true } });
      const epson = await prisma.printer.create({ data: { tenantId, name: "Epson", driver: "ESC_POS_TCP" as any, host: process.env.EPSON_PRINTER_IP || "192.168.2.168", port: Number(process.env.EPSON_PRINTER_PORT || 9100), paperWidth: 80, isActive: false } });
      items = [epson, star];
    } catch {
      // ignore seed failure
    }
  }
  res.json({ printers: items });
}));

settingsRouter.post("/core/printers", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const parsed = PrinterBody.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const created = await prisma.printer.create({ data: { tenantId, ...parsed.data } });
  res.json({ printer: created });
}));

settingsRouter.put("/core/printers/:id", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const id = String(req.params.id);
  const parsed = PrinterBody.partial().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const updated = await prisma.printer.update({ where: { id }, data: parsed.data });
  res.json({ printer: updated });
}));

settingsRouter.delete("/core/printers/:id", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const id = String(req.params.id);
  await prisma.printer.delete({ where: { id } });
  res.json({ ok: true });
}));

// Test print via active printer or provided printerId (tenant-scoped)
settingsRouter.post("/core/printers/test", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req as any);
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const body = (req.body || {}) as { printerId?: string };
  let printer = null as any;
  if (body.printerId) {
    printer = await prisma.printer.findFirst({ where: { id: body.printerId, tenantId } });
  }
  if (!printer) {
    printer = await prisma.printer.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: "asc" } });
  }
  if (!printer) {
    return res.status(400).json({ error: { message: "NO_PRINTER_CONFIGURED" } });
  }
  console.log("[settings.printer.test]", { tenantId, id: printer.id, name: printer.name, host: printer.host, port: printer.port, driver: printer.driver });
  try {
    const driver = printer.driver as any;
    const asciiMode = printer.escposAsciiMode !== false;
    const tenant = { name: "Cafetaria Centrum" };
    const order = {
      label: "Test",
      createdAt: new Date().toISOString(),
      lines: [
        { name: "Friet groot", qty: 1, unitPriceCents: 350 },
        { name: "Cola", qty: 2, unitPriceCents: 250 },
      ],
      totals: { subtotalExVatCents: 850, vatCents: 178, totalInclVatCents: 1028, vatLabel: "BTW 21%" },
      payment: { method: "PIN", paidAt: new Date().toISOString() },
    };
    const payload = buildReceipt80({ tenant, order, driver, asciiMode });
    // Send via raw TCP using the receipt job path
    await printToPrinter({ id: printer.id, name: printer.name, driver: printer.driver, host: printer.host, port: printer.port } as any, { kind: "RECEIPT", payload: { tenant, order } });
    return res.json({ ok: true });
  } catch (e: any) {
    const code = (e && (e.code || e.errno)) || undefined;
    const msg = e?.message || String(e);
    console.error("[settings.printer.test] error", { code, msg });
    let status = 500; let error = "PRINT_FAILED";
    if (/PRINT_TIMEOUT|PRINTER_TIMEOUT/i.test(msg)) { status = 504; error = "PRINT_TIMEOUT"; }
    else if (code === "ECONNREFUSED") { status = 502; error = "ECONNREFUSED"; }
    else if (code === "EHOSTUNREACH" || code === "ENETUNREACH") { status = 502; error = "EHOSTUNREACH"; }
    else if (code === "ETIMEDOUT") { status = 504; error = "ETIMEDOUT"; }
    return res.status(status).json({ error: { message: error, details: { code, message: msg } } });
  }
}));

// Test only feed+cut behavior
settingsRouter.post("/core/printers/test-cut", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req as any);
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  let printer = await prisma.printer.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: "asc" } });
  if (!printer) return res.status(400).json({ error: { message: "NO_PRINTER_CONFIGURED" } });
  console.log("[settings.printer.test-cut]", { tenantId, id: printer.id, host: printer.host, port: printer.port, driver: printer.driver });
  try {
    await printToPrinter({ id: printer.id, name: printer.name, driver: printer.driver, host: printer.host, port: printer.port } as any, { kind: "TEST_CUT" as any });
    return res.json({ ok: true });
  } catch (e: any) {
    const code = (e && (e.code || e.errno)) || undefined;
    const msg = e?.message || String(e);
    let status = 500; let error = "PRINT_FAILED";
    if (/PRINT_TIMEOUT|PRINTER_TIMEOUT/i.test(msg)) { status = 504; error = "PRINT_TIMEOUT"; }
    else if (code === "ECONNREFUSED") { status = 502; error = "ECONNREFUSED"; }
    else if (code === "EHOSTUNREACH" || code === "ENETUNREACH") { status = 502; error = "EHOSTUNREACH"; }
    else if (code === "ETIMEDOUT") { status = 504; error = "ETIMEDOUT"; }
    return res.status(status).json({ error: { message: error, details: { code, message: msg } } });
  }
}));

// Optional: cash drawer pulse test
settingsRouter.post("/core/printers/drawer/test", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req as any);
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  let printer = await prisma.printer.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: "asc" } });
  if (!printer) return res.status(400).json({ error: { message: "NO_PRINTER_CONFIGURED" } });
  console.log("[settings.printer.drawer-test]", { tenantId, id: printer.id, host: printer.host, port: printer.port, driver: printer.driver });
  try {
    const payload = buildDrawerPulse("Lade test");
    await sendEscposTcpRaw(printer.host, Number(printer.port || 9100), payload);
    return res.json({ ok: true });
  } catch (e: any) {
    const code = (e && (e.code || e.errno)) || undefined;
    const msg = e?.message || String(e);
    let status = 500; let error = "PRINT_FAILED";
    if (/PRINT_TIMEOUT|PRINTER_TIMEOUT/i.test(msg)) { status = 504; error = "PRINT_TIMEOUT"; }
    else if (code === "ECONNREFUSED") { status = 502; error = "ECONNREFUSED"; }
    else if (code === "EHOSTUNREACH" || code === "ENETUNREACH") { status = 502; error = "EHOSTUNREACH"; }
    else if (code === "ETIMEDOUT") { status = 504; error = "ETIMEDOUT"; }
    return res.status(status).json({ error: { message: error, details: { code, message: msg } } });
  }
}));

// Minimal receipt print (tenant-scoped)
settingsRouter.post("/core/printers/print-receipt", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req as any);
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const body = (req.body || {}) as { orderId?: string; printerId?: string; title?: string; lines?: Array<{ qty: number; title: string; priceCents: number }>; totalInclVatCents?: number };
  let printer = null as any;
  if (body.printerId) {
    printer = await prisma.printer.findFirst({ where: { id: body.printerId, tenantId } });
  }
  if (!printer) {
    printer = await prisma.printer.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: "asc" } });
  }
  if (!printer) return res.status(400).json({ error: { message: "NO_PRINTER_CONFIGURED" } });
  try {
    let order: any = null;
    if (body.orderId) {
      order = await prisma.order.findFirst({ where: { id: body.orderId, tenantId }, include: { lines: true, customer: true } });
    }
    const lines = order?.lines?.map((l: any) => ({ name: l.title, qty: l.qty, unitPriceCents: l.priceCents })) || (Array.isArray(body.lines) ? body.lines.map((l) => ({ name: l.title, qty: l.qty, unitPriceCents: l.priceCents })) : []);
    const subtotal = order?.subtotalExclVatCents ?? lines.reduce((s: number, l: any) => s + (Number(l.qty || 1) * Number(l.unitPriceCents || 0)), 0);
    const total = order?.totalInclVatCents ?? (typeof body.totalInclVatCents === "number" ? body.totalInclVatCents : subtotal);
    const vat = total - subtotal;
    const tenant = { name: "Cafetaria Centrum" };
    const orderDto = {
      label: order?.receiptLabel || order?.draftLabel || body.title || (order?.id || `adhoc-${Date.now()}`),
      createdAt: order?.createdAt || new Date().toISOString(),
      customerName: order?.customer?.name ?? null,
      tableName: null,
      lines,
      totals: { subtotalExVatCents: subtotal, vatCents: vat, totalInclVatCents: total, vatLabel: "BTW" },
      payment: { method: order?.paymentMethod || "PIN", paidAt: order?.paidAt || null },
    };
    await printToPrinter(printer as any, { kind: "RECEIPT", payload: { tenant, order: orderDto } });
    return res.json({ ok: true });
  } catch (e: any) {
    const code = (e && (e.code || e.errno)) || undefined;
    const msg = e?.message || String(e);
    let status = 500; let error = "PRINT_FAILED";
    if (/PRINT_TIMEOUT|PRINTER_TIMEOUT/i.test(msg)) { status = 504; error = "PRINT_TIMEOUT"; }
    else if (code === "ECONNREFUSED") { status = 502; error = "ECONNREFUSED"; }
    else if (code === "EHOSTUNREACH" || code === "ENETUNREACH") { status = 502; error = "EHOSTUNREACH"; }
    else if (code === "ETIMEDOUT") { status = 504; error = "ETIMEDOUT"; }
    return res.status(status).json({ error: { message: error, details: { code, message: msg } } });
  }
}));

// =========================
// Print Configs CRUD
// =========================
const PrintConfigBody = z.object({
  name: z.string().min(1),
  template: z.enum(["CUSTOMER_RECEIPT", "KITCHEN_TICKET", "QR_CARD"]),
  plan: z.enum(["NEVER", "ON_PAY", "ON_SEND_TO_KDS", "MANUAL"]).default("MANUAL"),
  targetPrinters: z.array(z.string()).default([]),
  channels: z.array(z.enum(["POS", "WEB", "TAKEAWAY", "DELIVERY"])).default([]),
  areas: z.array(z.string()).default([]),
  prepStations: z.array(z.string()).default([]),
  ignoreLinesWithoutPrepStation: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

settingsRouter.get("/core/print-configs", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const items = await prisma.printConfig.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  res.json({ configs: items });
}));

settingsRouter.post("/core/print-configs", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const parsed = PrintConfigBody.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const created = await prisma.printConfig.create({ data: { tenantId, ...parsed.data } });
  res.json({ config: created });
}));

settingsRouter.put("/core/print-configs/:id", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const id = String(req.params.id);
  const parsed = PrintConfigBody.partial().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const updated = await prisma.printConfig.update({ where: { id }, data: parsed.data });
  res.json({ config: updated });
}));

settingsRouter.delete("/core/print-configs/:id", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const id = String(req.params.id);
  await prisma.printConfig.delete({ where: { id } });
  res.json({ ok: true });
}));
