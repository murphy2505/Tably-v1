import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler, validationError } from "../../lib/http";
import { z } from "zod";

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
  const items = await prisma.printer.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
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
