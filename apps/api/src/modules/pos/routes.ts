import express, { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { getTenantIdFromRequest } from "../../tenant";
import { asyncHandler, notFound, validationError } from "../../lib/http";
import { z } from "zod";

export const posRouter = express.Router();

// GET /api/pos/tables -> list tables + status
posRouter.get("/pos/tables", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

  const activeOrderId = typeof req.query.activeOrderId === "string" ? req.query.activeOrderId : undefined;
  let activeOrderTableId: string | undefined;
  if (activeOrderId) {
    const ord = await (prisma as any).order.findFirst({ where: { id: activeOrderId, tenantId }, select: { tableId: true } });
    activeOrderTableId = ord?.tableId ?? undefined;
  }

  const tables = await (prisma as any).table.findMany({ where: { tenantId }, orderBy: [{ sortIndex: "asc" }, { name: "asc" }] });
  const openOrders = await (prisma as any).order.findMany({ where: { tenantId, status: "OPEN", NOT: { tableId: null } }, select: { id: true, tableId: true } });
  const openByTable = new Map<string, string>();
  for (const o of openOrders) {
    if (o.tableId) openByTable.set(o.tableId, o.id);
  }

  const data = (tables as any[]).map((t: any) => {
    const isActive = activeOrderTableId && t.id === activeOrderTableId;
    const openOrderId = openByTable.get(t.id);
    const status = isActive ? "ACTIVE" : openOrderId ? "BUSY" : "FREE";
    return { id: t.id, name: t.name, capacity: t.capacity, area: t.area, sortIndex: t.sortIndex, status, openOrderId: openOrderId ?? null };
  });
  return res.json({ tables: data });
}));

// POST /api/pos/tables -> create table (settings use too)
posRouter.post("/pos/tables", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const Body = z.object({ name: z.string().min(1), capacity: z.number().int().positive().optional(), area: z.string().optional(), sortIndex: z.number().int().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const created = await (prisma as any).table.create({ data: { tenantId, name: parsed.data.name, capacity: parsed.data.capacity, area: parsed.data.area, sortIndex: parsed.data.sortIndex ?? 0 } });
  return res.status(201).json({ table: created });
}));

// PUT /api/pos/tables/:id -> update
posRouter.put("/pos/tables/:id", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const id = String(req.params.id);
  const Body = z.object({ name: z.string().min(1).optional(), capacity: z.number().int().positive().nullable().optional(), area: z.string().nullable().optional(), sortIndex: z.number().int().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const existing = await (prisma as any).table.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const updated = await (prisma as any).table.update({ where: { id }, data: { name: parsed.data.name ?? existing.name, capacity: parsed.data.capacity ?? existing.capacity, area: parsed.data.area ?? existing.area, sortIndex: parsed.data.sortIndex ?? existing.sortIndex } });
  return res.json({ table: updated });
}));

// GET /api/pos/floorplan -> get current layoutJson
posRouter.get("/pos/floorplan", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const fp = await (prisma as any).floorplan.findFirst({ where: { tenantId } });
  if (!fp) return res.json({ floorplan: { id: null, name: "Standaard", layoutJson: [], tenantId } });
  return res.json({ floorplan: fp });
}));

// PUT /api/pos/floorplan -> save layoutJson
posRouter.put("/pos/floorplan", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const Body = z.object({ name: z.string().min(1).optional(), layoutJson: z.any() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const existing = await (prisma as any).floorplan.findFirst({ where: { tenantId } });
  const payload = { name: parsed.data.name ?? (existing?.name ?? "Standaard"), layoutJson: parsed.data.layoutJson as any };
  const saved = existing
    ? await (prisma as any).floorplan.update({ where: { tenantId }, data: payload })
    : await (prisma as any).floorplan.create({ data: { tenantId, ...payload } });
  return res.json({ floorplan: saved });
}));

// POST /api/pos/orders/:id/book -> book order on TABLE|GROUP|CUSTOMER
posRouter.post("/pos/orders/:id/book", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const id = String(req.params.id);
  const Body = z.object({ type: z.enum(["TABLE","GROUP","CUSTOMER","NONE"]).optional(), tableId: z.string().nullable().optional(), groupId: z.string().nullable().optional(), customerId: z.string().nullable().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const existing = await prisma.order.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);

  const type = parsed.data?.type ?? (parsed.data?.tableId ? "TABLE" : parsed.data?.groupId ? "GROUP" : parsed.data?.customerId ? "CUSTOMER" : "NONE");
  let patch: any = {};
  if (type === "TABLE") {
    patch = { tableId: parsed.data.tableId ?? null, groupId: null, customerId: null };
  } else if (type === "GROUP") {
    patch = { groupId: parsed.data.groupId ?? null, tableId: null, customerId: null };
  } else if (type === "CUSTOMER") {
    patch = { customerId: parsed.data.customerId ?? null, tableId: null, groupId: null };
  } else {
    patch = { tableId: null, groupId: null };
  }

  const updated = await (prisma as any).order.update({ where: { id }, data: patch, include: { lines: true, customer: true, table: { select: { id: true, name: true } }, group: { select: { id: true, name: true } } } });
  return res.json({ order: updated });
}));

// POST /api/pos/tables/:id/open -> reuse existing OPEN order or create new
posRouter.post("/pos/tables/:id/open", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const tableId = String(req.params.id);
  const table = await (prisma as any).table.findFirst({ where: { id: tableId, tenantId } });
  if (!table) return notFound(res);

  const open = await (prisma as any).order.findFirst({ where: { tenantId, tableId, status: "OPEN" }, include: { lines: true, customer: true, table: { select: { id: true, name: true } }, group: { select: { id: true, name: true } } } });
  if (open) return res.json({ order: open });

  // create via orders create flow to issue draft numbers consistently
  const created = await (prisma as any).order.create({ data: { tenantId, status: "OPEN" as any, kind: "TRACKED" as any, tableId } });
  // No lines to recalc, return basic order
  const full = await (prisma as any).order.findFirst({ where: { id: created.id, tenantId }, include: { lines: true, customer: true, table: { select: { id: true, name: true } }, group: { select: { id: true, name: true } } } });
  return res.status(201).json({ order: full });
}));

export default posRouter;
// Groups (MVP) — list/create for booking
posRouter.get("/pos/groups", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const groups = await (prisma as any).group.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  return res.json({ groups });
}));

posRouter.post("/pos/groups", asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const Body = z.object({ name: z.string().min(1), note: z.string().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const created = await (prisma as any).group.create({ data: { tenantId, name: parsed.data.name, note: parsed.data.note } });
  return res.status(201).json({ group: created });
}));

// Dev seed: create demo tables and a simple layout if none exist
posRouter.post("/pos/tables/dev-seed", asyncHandler(async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") return res.status(403).json({ error: { message: "DISALLOWED_IN_PROD" } });
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const Body = z.object({ count: z.number().int().min(1).max(20).optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const count = parsed.data?.count ?? 6;
  const existing = await (prisma as any).table.count({ where: { tenantId } });
  if (existing > 0) return res.json({ seeded: false, message: "tables already exist" });

  const created: any[] = [];
  for (let i = 1; i <= count; i++) {
    const name = `T${i}`;
    const t = await (prisma as any).table.create({ data: { tenantId, name, sortIndex: i, capacity: 4 } });
    created.push(t);
  }
  // Simple grid layout 3 columns
  const blocks = created.map((t, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 24 + col * 140;
    const y = 24 + row * 110;
    return { id: t.id, x, y, w: 110, h: 84 };
  });
  const existingFp = await (prisma as any).floorplan.findFirst({ where: { tenantId } });
  if (existingFp) {
    await (prisma as any).floorplan.update({ where: { tenantId }, data: { layoutJson: blocks } });
  } else {
    await (prisma as any).floorplan.create({ data: { tenantId, name: "Standaard", layoutJson: blocks } });
  }
  return res.json({ seeded: true, tables: created, layout: blocks });
}));
