import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler, validationError, notFound } from "../../lib/http";
import { getTenantIdFromRequest } from "../../tenant";
import { z } from "zod";

/**
 * Curl examples:
 *
 * # Create or upsert customer (by phone)
 * curl -i -X POST http://localhost:4002/api/loyalty/customers \
 *   -H "x-tenant-id: cafetaria-centrum" \
 *   -H "Content-Type: application/json" \
 *   -d '{"name":"Jan","phoneE164":"+31612345678","email":"jan@example.com"}'
 *
 * # Search customers
 * curl -s "http://localhost:4002/api/loyalty/customers?query=jan&take=20" \
 *   -H "x-tenant-id: cafetaria-centrum"
 */

export const loyaltyCustomersRouter = Router();

const CreateBody = z.object({
  name: z.string().max(120).optional(),
  phoneE164: z.string().max(32).optional(),
  email: z.string().email().optional(),
  note: z.string().max(1000).optional(),
});

loyaltyCustomersRouter.post("/customers", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { name = null, phoneE164 = null, email = null, note = null } = parsed.data;

  if (phoneE164 && !phoneE164.startsWith("+")) {
    return validationError(res, [{ path: ["phoneE164"], message: "PHONE_E164_INVALID" }]);
  }

  let customer;
  if (phoneE164) {
    customer = await prisma.customer.upsert({
      where: { tenantId_phoneE164: { tenantId, phoneE164 } },
      update: { name: name ?? undefined, email: email ?? undefined, note: note ?? undefined, isActive: true },
      create: {
        tenantId,
        name,
        phoneE164,
        email,
        note,
        loyalty: { create: { tenantId } },
      },
      include: { loyalty: true },
    });
  } else {
    customer = await prisma.customer.create({
      data: { tenantId, name, email, note, loyalty: { create: { tenantId } } },
      include: { loyalty: true },
    });
  }

  return res.status(201).json({ customer });
}));

loyaltyCustomersRouter.get("/customers", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

  const query = String((req.query.query as string) || "").trim();
  const takeRaw = Number((req.query.take as string) || 20);
  const take = Math.min(50, Math.max(1, Number.isFinite(takeRaw) ? takeRaw : 20));

  const where: any = { tenantId, isActive: true };
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { phoneE164: { contains: query } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: { loyalty: true },
  });
  return res.json({ customers });
}));

loyaltyCustomersRouter.get("/customers/:id", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const id = String(req.params.id);
  const customer = await prisma.customer.findFirst({ where: { id, tenantId }, include: { loyalty: true } });
  if (!customer) return notFound(res);
  return res.json({ customer });
}));
