import { prisma } from "../../lib/prisma";
import { z } from "zod";
import { Request, Response } from "express";
import { validationError, notFound } from "../../lib/http";
import { getTenantIdFromRequest } from "../../tenant";

export const groupBodySchema = z.object({
  name: z.string().min(1),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export async function listGroups(req: Request, res: Response) {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const groups = await prisma.modifierGroup.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { options: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });
  return res.json({ groups });
}

export async function createGroup(req: Request, res: Response) {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const parsed = groupBodySchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const data = parsed.data;
  const group = await prisma.modifierGroup.create({
    data: { tenantId, name: data.name, minSelect: data.minSelect, maxSelect: data.maxSelect, isActive: data.isActive ?? true, sortOrder: data.sortOrder },
  });
  return res.status(201).json({ group });
}

export async function updateGroup(req: Request, res: Response) {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const id = String(req.params.id);
  const parsed = groupBodySchema.partial().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const found = await prisma.modifierGroup.findFirst({ where: { id, tenantId } });
  if (!found) return notFound(res);
  const group = await prisma.modifierGroup.update({ where: { id }, data: parsed.data });
  return res.json({ group });
}

const optionBodySchema = z.object({ name: z.string().min(1), priceDeltaCents: z.number().int(), isActive: z.boolean().optional(), sortOrder: z.number().int().min(0).default(0) });

export async function createOption(req: Request, res: Response) {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const groupId = String(req.params.id);
  const group = await prisma.modifierGroup.findFirst({ where: { id: groupId, tenantId } });
  if (!group) return notFound(res);
  const parsed = optionBodySchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const opt = await prisma.modifierOption.create({
    data: { tenantId, groupId, name: parsed.data.name, priceDeltaCents: parsed.data.priceDeltaCents, isActive: parsed.data.isActive ?? true, sortOrder: parsed.data.sortOrder },
  });
  return res.status(201).json({ option: opt });
}

export async function updateOption(req: Request, res: Response) {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const id = String(req.params.id);
  const found = await prisma.modifierOption.findFirst({ where: { id, tenantId } });
  if (!found) return notFound(res);
  const parsed = optionBodySchema.partial().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const opt = await prisma.modifierOption.update({ where: { id }, data: parsed.data });
  return res.json({ option: opt });
}

export async function deleteOption(req: Request, res: Response) {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);
  const id = String(req.params.id);
  const found = await prisma.modifierOption.findFirst({ where: { id, tenantId } });
  if (!found) return notFound(res);
  await prisma.modifierOption.delete({ where: { id } });
  return res.status(204).send();
}

export const setProductGroupsBody = z.object({ groupIds: z.array(z.string()).default([]) });

export async function setProductGroups(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  if (!prisma) {
    console.error("[API MISCONFIG] Prisma missing", { route: req.originalUrl, tenantId });
    return res.status(500).json({ error: { message: "SERVER_MISCONFIG" } });
  }
  const productId = String(req.params.id);
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) return notFound(res);
  const parsed = setProductGroupsBody.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { groupIds } = parsed.data;
  // Validate groups belong to tenant
  const groups = await prisma.modifierGroup.findMany({ where: { id: { in: groupIds }, tenantId, isActive: true } });
  const validIds = new Set(groups.map((g) => g.id));
  // Replace attachments: delete existing, then create with sortOrder by provided order
  await prisma.productModifierGroup.deleteMany({ where: { tenantId, productId } });
  for (let i = 0; i < groupIds.length; i++) {
    const gid = groupIds[i];
    if (!validIds.has(gid)) continue;
    await prisma.productModifierGroup.create({ data: { tenantId, productId, groupId: gid, sortOrder: i } });
  }
  const attachments = await prisma.productModifierGroup.findMany({ where: { tenantId, productId }, orderBy: { sortOrder: "asc" }, include: { group: true } });
  return res.json({ productId, groups: attachments.map((a) => a.group) });
}

export async function resolveModifiersForProduct(tenantId: string, productId: string) {
  const attachments = await prisma.productModifierGroup.findMany({ where: { tenantId, productId }, orderBy: { sortOrder: "asc" }, include: { group: { include: { options: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } } } });
  return attachments.map((a) => a.group);
}

export async function getProductModifierGroups(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  if (!prisma) {
    console.error("[API MISCONFIG] Prisma missing", { route: req.originalUrl, tenantId });
    return res.status(500).json({ error: { message: "SERVER_MISCONFIG" } });
  }
  const productId = String(req.params.id);
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) return notFound(res);
  const groups = await resolveModifiersForProduct(tenantId, productId);
  if (process.env.DEBUG_API === "1") {
    console.log("[product.modifiers]", { tenantId, productId, groupCount: groups.length });
  }
  return res.json({ groups });
}

export async function resolveModifiersForMenuItem(tenantId: string, menuItemId: string) {
  const rows = await prisma.menuCardItemModifierGroup.findMany({
    where: { tenantId, menuCardItemId: menuItemId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { group: { include: { options: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } } },
  });
  return rows.map((r) => ({
    id: r.group.id,
    name: r.group.name,
    minSelect: r.minSelectOverride ?? r.group.minSelect ?? 0,
    maxSelect: r.maxSelectOverride ?? r.group.maxSelect ?? 1,
    options: r.group.options,
  }));
}
