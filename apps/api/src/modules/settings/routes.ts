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
