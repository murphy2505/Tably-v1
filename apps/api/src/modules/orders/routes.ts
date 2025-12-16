import { Router, Response } from "express";
import { asyncHandler, validationError, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

export const ordersRouter = Router();

// Simple in-memory SSE hub per tenant
type TenantId = string;
type Client = { res: Response };
const sseClients: Map<TenantId, Set<Client>> = new Map();

function sseBroadcast(tenantId: string, event: string, data: any) {
  const set = sseClients.get(tenantId);
  if (!set || set.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const { res } of set) {
    try {
      res.write(`event: ${event}\n`);
      res.write(payload);
    } catch {}
  }
}

const TransitionBody = z.object({ to: z.enum(["OPEN", "SENT", "IN_PREP", "READY", "COMPLETED", "CANCELLED"]) });

const allowed: Record<string, string[]> = {
  OPEN: ["SENT", "CANCELLED"],
  SENT: ["IN_PREP", "CANCELLED"],
  IN_PREP: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

ordersRouter.post("/core/orders/:id/transition", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  console.log("[transition]", { id: req.params.id, tenantId });

  const parsed = TransitionBody.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { to } = parsed.data;

  const id = String(req.params.id);
  const existing = await prisma.order.findFirst({ where: { id, tenantId }, include: { lines: true } });
  console.log("[transition] found", existing ? { id: existing.id, tenantId: existing.tenantId, status: existing.status } : false);
  if (!existing) return notFound(res);

  const from = existing.status as keyof typeof allowed;
  const can = allowed[from]?.includes(to) ?? false;
  if (!can) {
    return res.status(409).json({ error: { message: "INVALID_TRANSITION", from, to } });
  }

  const now = new Date();
  const timestampPatch: any = {};
  if (to === "SENT") timestampPatch.sentAt = now;
  else if (to === "IN_PREP") timestampPatch.inPrepAt = now;
  else if (to === "READY") timestampPatch.readyAt = now;
  else if (to === "COMPLETED") timestampPatch.completedAt = now;
  else if (to === "CANCELLED") timestampPatch.cancelledAt = now;

  const updated = await prisma.order.update({
    where: { id },
    data: { status: to as any, ...timestampPatch },
    include: { lines: true },
  });

  console.log("[order.transition]", { orderId: id, from, to });
  // KDS broadcast: notify streams in this tenant
  sseBroadcast(tenantId, "order", { type: "ORDER_UPDATED", orderId: id, status: updated.status, updatedAt: new Date().toISOString() });
  return res.json({ order: updated });
}));

// Create new OPEN order
ordersRouter.post("/core/orders", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const Body = z.object({ tableId: z.string().nullable().optional() }).optional();
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);

  const order = await prisma.order.create({
    data: { tenantId, status: "OPEN" as any },
    include: { lines: true },
  });
  return res.status(201).json({ order });
}));

// Add or update line in order
ordersRouter.post("/core/orders/:id/lines", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const id = String(req.params.id);
  const existing = await prisma.order.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);

  const Body = z.object({ productId: z.string(), qty: z.number().int().positive().optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { productId, qty = 1 } = parsed.data;

  // fetch product price
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) return notFound(res);
  const priceCents = product.basePriceCents;

  // check if a line for product exists (by title or productId—schema lacks productId on OrderLine)
  // We'll match on title (product name); if exists, update qty; else create
  const title = product.name;
  const line = await prisma.orderLine.findFirst({ where: { orderId: id, tenantId, title } });
  if (line) {
    await prisma.orderLine.update({ where: { id: line.id }, data: { qty: line.qty + qty } });
  } else {
    await prisma.orderLine.create({ data: { tenantId, orderId: id, title, qty, priceCents } });
  }

  const order = await prisma.order.findFirst({ where: { id, tenantId }, include: { lines: true } });
  return res.json({ order });
}));
// List orders (tenant-scoped)
ordersRouter.get("/core/orders", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const status = (req.query.status as string | undefined) ?? undefined;
  const where: any = { tenantId };
  if (status) where.status = status as any;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { lines: true },
  });
  return res.json({ orders });
}));

// Last completed order (tenant-scoped)
ordersRouter.get("/core/orders/last-completed", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const last = await prisma.order.findFirst({
    where: { tenantId, status: "COMPLETED" as any },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    include: { lines: true },
  });
  if (!last) return notFound(res);
  return res.json({ order: last });
}));

// Order detail (tenant-scoped)
ordersRouter.get("/core/orders/:id", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const id = String(req.params.id);
  const order = await prisma.order.findFirst({ where: { id, tenantId }, include: { lines: true } });
  if (!order) return notFound(res);
  return res.json({ order });
}));

// KDS: SSE stream (accepts header x-tenant-id or query tenantId for EventSource compatibility)
ordersRouter.get("/core/kds/stream", asyncHandler(async (req, res) => {
  const headerTenant = req.header("x-tenant-id");
  const queryTenant = (req.query.tenantId as string | undefined) ?? undefined;
  const tenantId = headerTenant || queryTenant;
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const client: Client = { res };
  const set = sseClients.get(tenantId) ?? new Set<Client>();
  set.add(client);
  sseClients.set(tenantId, set);

  // Initial comment to open stream
  res.write(`: connected tenant ${tenantId}\n\n`);

  const interval = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {}
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
    const group = sseClients.get(tenantId);
    if (group) {
      group.delete(client);
      if (group.size === 0) sseClients.delete(tenantId);
    }
  });
}));

// KDS: helper tickets list for a single status
ordersRouter.get("/core/kds/tickets", asyncHandler(async (req, res) => {
  const tenantId = req.header("x-tenant-id");
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const status = String(req.query.status || "");
  const valid = ["SENT", "IN_PREP", "READY"]; // Only relevant for KDS columns
  if (!valid.includes(status)) {
    return validationError(res, [{ path: ["status"], message: "INVALID_STATUS" }]);
  }

  const orders = await prisma.order.findMany({
    where: { tenantId, status: status as any },
    orderBy: { createdAt: "asc" },
    include: { lines: true },
  });
  return res.json({ orders });
}));
