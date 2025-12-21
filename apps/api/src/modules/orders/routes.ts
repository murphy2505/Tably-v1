import { Router, Response } from "express";
import { asyncHandler, validationError, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { z } from "zod";
import { getTenantIdFromRequest } from "../../tenant";
import { issueDraftNumberTx } from "./draft";
import { resolveModifiersForProduct, resolveModifiersForMenuItem } from "../modifiers/controller";
import { issueReceiptNumberTx } from "./receipt";
import { calculateAndPersistOrderTotals } from "./totals";
import { resolveVatRateForOrderLine } from "./vatResolver";

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

const TransitionBody = z.object({ to: z.enum(["OPEN", "SENT", "IN_PREP", "READY", "PAID", "COMPLETED", "CANCELLED"]) });

const allowed: Record<string, string[]> = {
  OPEN: ["SENT", "CANCELLED"],
  SENT: ["IN_PREP", "CANCELLED"],
  IN_PREP: ["READY", "CANCELLED"],
  READY: ["PAID", "COMPLETED", "CANCELLED"],
  PAID: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

ordersRouter.post("/core/orders/:id/transition", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

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
  else if (to === "PAID") timestampPatch.paidAt = now;
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

// DELETE order: only for QUICK empty orders in OPEN/PARKED without payments
ordersRouter.delete("/core/orders/:id", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const id = String(req.params.id);
  const ord = await prisma.order.findFirst({ where: { id, tenantId }, include: { lines: true } });
  if (!ord) return notFound(res);
  const isQuick = (ord as any).kind === "QUICK";
  const deletableStatus = ord.status === ("OPEN" as any) || ord.status === ("PARKED" as any);
  const noPayments = !ord.paidAt;
  if (!isQuick || !deletableStatus || !noPayments || ord.lines.length !== 0) {
    return res.status(409).json({ error: { message: "CANNOT_DELETE_ORDER" } });
  }
  await prisma.order.delete({ where: { id } });
  return res.json({ ok: true });
}));

// VOID quick order: set status=VOIDED; only allowed for QUICK in OPEN/PARKED and no payments
ordersRouter.post("/core/orders/:id/void", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const id = String(req.params.id);
  const ord = await prisma.order.findFirst({ where: { id, tenantId }, include: { lines: true } });
  if (!ord) return notFound(res);
  const isQuick = (ord as any).kind === "QUICK";
  const allowedStatus = ord.status === ("OPEN" as any) || ord.status === ("PARKED" as any);
  const noPayments = !ord.paidAt;
  if (!isQuick || !allowedStatus || !noPayments) {
    return res.status(409).json({ error: { message: "CANNOT_VOID_ORDER" } });
  }
  const Body = z.object({ reason: z.string().max(200).optional() }).optional();
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const reason = parsed.data?.reason ?? null;
  const updated = await prisma.order.update({ where: { id }, data: { status: "VOIDED" as any, voidReason: reason } });
  sseBroadcast(tenantId, "order", { type: "ORDER_UPDATED", orderId: id, status: updated.status, updatedAt: new Date().toISOString() });
  return res.json({ order: updated });
}));

// PARK quick order: set status=PARKED; only for QUICK in OPEN and no payments
ordersRouter.post("/core/orders/:id/park", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const id = String(req.params.id);
  const ord = await prisma.order.findFirst({ where: { id, tenantId }, include: { lines: true } });
  if (!ord) return notFound(res);
  const isQuick = (ord as any).kind === "QUICK";
  const allowedStatus = ord.status === ("OPEN" as any);
  const noPayments = !ord.paidAt;
  if (!isQuick || !allowedStatus || !noPayments) {
    return res.status(409).json({ error: { message: "CANNOT_PARK_ORDER" } });
  }
  const Body = z.object({ label: z.string().max(64).optional() }).optional();
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const label = parsed.data?.label ?? null;
  const updated = await prisma.order.update({ where: { id }, data: { status: "PARKED" as any, draftLabel: label } });
  sseBroadcast(tenantId, "order", { type: "ORDER_UPDATED", orderId: id, status: updated.status, updatedAt: new Date().toISOString() });
  return res.json({ order: updated });
}));

// CANCEL tracked order: set status=CANCELLED; only for TRACKED in OPEN/PARKED and no payments
ordersRouter.post("/core/orders/:id/cancel", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  const id = String(req.params.id);
  const ord = await prisma.order.findFirst({ where: { id, tenantId } });
  if (!ord) return notFound(res);
  const isTracked = (ord as any).kind === "TRACKED";
  const allowedStatus = ord.status === ("OPEN" as any) || ord.status === ("PARKED" as any);
  const noPayments = !ord.paidAt;
  if (!isTracked || !allowedStatus || !noPayments) {
    return res.status(409).json({ error: { message: "CANNOT_CANCEL_ORDER" } });
  }
  const Body = z.object({ reason: z.string().min(1).max(200) });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const updated = await prisma.order.update({ where: { id }, data: { status: "CANCELLED" as any, cancelReason: parsed.data.reason, cancelledAt: new Date() } });
  sseBroadcast(tenantId, "order", { type: "ORDER_UPDATED", orderId: id, status: updated.status, updatedAt: new Date().toISOString() });
  return res.json({ order: updated });
}));

// Pay endpoint (MVP): sets status=PAID and stores basic payment info
ordersRouter.post("/core/orders/:id/pay", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

  const id = String(req.params.id);
  const existing = await prisma.order.findFirst({ where: { id, tenantId }, include: { lines: true } });
  if (!existing) return notFound(res);

  // Only allow paying non-finalized orders
  const finalStates = new Set(["PAID", "COMPLETED", "CANCELLED"]);
  if (finalStates.has(existing.status as any)) {
    return res.status(409).json({ error: { message: "ALREADY_FINALIZED", status: existing.status } });
  }

  const Body = z.object({
    method: z.enum(["PIN", "CASH"]),
    paymentRef: z.string().max(128).optional(),
    cashReceivedCents: z.number().int().nonnegative().optional(),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { method, paymentRef, cashReceivedCents } = parsed.data;

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const patch: any = {
      status: "PAID",
      paidAt: now,
      paymentMethod: method,
      paymentRef: paymentRef ?? (method === "PIN" ? "PIN-STUB" : null),
      cashReceivedCents: method === "CASH" ? (cashReceivedCents ?? 0) : null,
    };
    const paid = await tx.order.update({ where: { id }, data: patch, include: { lines: true } });
    // Issue receipt number if not yet present
    const hasReceipt = !!paid.receiptIssuedAt;
    const finalOrder = hasReceipt ? paid : await issueReceiptNumberTx(tx as any, tenantId, id, now);
    return finalOrder;
  });
  sseBroadcast(tenantId, "order", { type: "ORDER_UPDATED", orderId: id, status: updated.status, updatedAt: new Date().toISOString() });
  return res.json({ order: updated });
}));

// Create new OPEN order
ordersRouter.post("/core/orders", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

  const Body = z.object({ tableId: z.string().nullable().optional(), kind: z.enum(["QUICK","TRACKED"]).optional() }).optional();
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);

  const now = new Date();
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({ data: { tenantId, status: "OPEN" as any, kind: (parsed.data?.kind ?? "QUICK") as any }, include: { lines: true } });
    const withDraft = await issueDraftNumberTx(tx as any, tenantId, created.id, now);
    return withDraft;
  });
  const updated = await calculateAndPersistOrderTotals(tenantId, order.id);
  return res.status(201).json({ order: updated ?? order });
}));

// Add or update line in order
ordersRouter.post("/core/orders/:id/lines", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });
  if (!prisma) {
    console.error("[API MISCONFIG] Prisma missing", { route: req.originalUrl, tenantId });
    return res.status(500).json({ error: { message: "SERVER_MISCONFIG" } });
  }

  const id = String(req.params.id);
  const existing = await prisma.order.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);

  const Body = z.object({ productId: z.string(), variantId: z.string().nullable().optional(), menuItemId: z.string().nullable().optional(), qty: z.number().int().positive().optional(), selectedOptionIds: z.array(z.string()).optional() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { productId, variantId = null, menuItemId = null, qty = 1, selectedOptionIds = [] } = parsed.data;

  // fetch product price for base (VAT resolved separately)
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) return validationError(res, [{ path: ["productId"], message: "Onbekend product" }]);
  let priceCents = product.basePriceCents;
  const vatResolved = await resolveVatRateForOrderLine({ tenantId, productId, menuItemId });
  const vatRateBps = vatResolved.vatRateBps;
    // Sort selected options deterministically and build signature
    const selectedOptionIdsSorted = [...selectedOptionIds].sort();
    const modifierSignature = selectedOptionIdsSorted.join(",");
  // Resolve attached modifier groups (prefer menu item overrides)
  const groups = menuItemId ? await resolveModifiersForMenuItem(tenantId, menuItemId) : await resolveModifiersForProduct(tenantId, productId);
  const selectedSet = new Set(selectedOptionIds);
  const snapshotGroups: any[] = [];
  let deltaCentsTotal = 0;
  // Build map optionId -> option for quick lookup
  const optionsMap = new Map<string, { id: string; name: string; priceDeltaCents: number }>();
  for (const g of groups) {
    for (const opt of g.options) {
      optionsMap.set(opt.id, { id: opt.id, name: opt.name, priceDeltaCents: opt.priceDeltaCents });
    }
  }
  for (const g of groups) {
    const chosen: { optionId: string; name: string; deltaCents: number }[] = [];
    for (const opt of g.options) {
      if (selectedSet.has(opt.id)) {
        chosen.push({ optionId: opt.id, name: opt.name, deltaCents: opt.priceDeltaCents });
      }
    }
    // Validate min/max per group
    if (chosen.length < (g.minSelect ?? 0)) {
      return validationError(res, [{ path: ["selectedOptionIds"], message: `MIN_SELECT_NOT_MET:${g.name}:${g.minSelect}` }]);
    }
    if (g.maxSelect !== null && g.maxSelect !== undefined && chosen.length > g.maxSelect) {
      return validationError(res, [{ path: ["selectedOptionIds"], message: `MAX_SELECT_EXCEEDED:${g.name}:${g.maxSelect}` }]);
    }
    const groupSnap = { groupId: g.id, name: g.name, min: g.minSelect, max: g.maxSelect, selected: chosen };
    snapshotGroups.push(groupSnap);
    for (const c of chosen) deltaCentsTotal += c.deltaCents;
  }
  priceCents = priceCents + deltaCentsTotal;

  // check if a line for product exists (by title or productId—schema lacks productId on OrderLine)
  // We'll match on title (product name); if exists, update qty; else create
  const title = product.name;
  // No DB fields yet for product/variant/signature; merge by in-memory signature
  // Strategy: fetch lines with same title and pick the one whose computed signature matches
  const sameTitleLines = await prisma.orderLine.findMany({ where: { orderId: id, tenantId, title } });
  function computeLineSignature(l: any): string {
    const groups = (l?.modifiers as any)?.groups ?? [];
    const ids: string[] = [];
    for (const g of groups) {
      const selected = g?.selected ?? [];
      for (const s of selected) {
        if (typeof s?.optionId === "string") ids.push(s.optionId);
      }
    }
    return ids.sort().join(",");
  }
  const match = sameTitleLines.find((l) => computeLineSignature(l) === modifierSignature);
  if (match) {
    await prisma.orderLine.update({ where: { id: match.id }, data: { qty: match.qty + qty } });
  } else {
    await prisma.orderLine.create({ data: { tenantId, orderId: id, title, qty, priceCents, vatRateBps, vatSource: vatResolved.source, modifiers: { groups: snapshotGroups, deltaCentsTotal } as any } });
  }

  const updated = await calculateAndPersistOrderTotals(tenantId, id);
  return res.json({ order: updated! });
}));

// Smoke test scenario (comments):
// - Adding Friet + Mayo and Friet + Speciaal must produce 2 separate lines (not qty 2 on one line)
// - No DB migration yet; merge decision uses in-memory signature derived from line.modifiers
// List orders (tenant-scoped)
ordersRouter.get("/core/orders", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

  const status = (req.query.status as string | undefined) ?? undefined;
  const where: any = { tenantId };
  if (status) where.status = status as any;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { lines: true },
  });
  return res.json({ orders });
}));

// Last completed order (tenant-scoped)
ordersRouter.get("/core/orders/last-completed", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

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
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

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
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

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

// =============================
// Order ↔ Customer link/unlink
// =============================

// Link a customer to an order (tenant-safe)
ordersRouter.post("/api/orders/:orderId/customer", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return validationError(res, [{ path: ["x-tenant-id"], message: "TENANT_REQUIRED" }]);

  const Body = z.object({ customerId: z.string() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);

  const orderId = String(req.params.orderId);
  const { customerId } = parsed.data;

  // Ensure order belongs to tenant
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  if (!order) return res.status(404).json({ error: { message: "ORDER_NOT_FOUND" } });

  // Ensure customer belongs to tenant and is active
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId, isActive: true } });
  if (!customer) return res.status(404).json({ error: { message: "CUSTOMER_NOT_FOUND" } });

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { customerId },
    include: { customer: { include: { loyalty: true } } },
  });
  console.log("[orders.customer.link]", { orderId, tenantId, customerId });
  return res.json({ order: updated });
}));

// Unlink a customer from an order (tenant-safe)
ordersRouter.delete("/api/orders/:orderId/customer", asyncHandler(async (req, res) => {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

  const orderId = String(req.params.orderId);
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  if (!order) return res.status(404).json({ error: { message: "ORDER_NOT_FOUND" } });

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { customerId: null },
    include: { customer: { include: { loyalty: true } } },
  });
  console.log("[orders.customer.unlink]", { orderId, tenantId });
  return res.json({ order: updated });
}));

/*
Curl tests

1) Link customer to order
curl -s -X POST http://localhost:4002/api/orders/<ORDER_ID>/customer \
  -H "x-tenant-id: cafetaria-centrum" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"<CUSTOMER_ID>"}' | jq

2) Unlink customer from order
curl -s -X DELETE http://localhost:4002/api/orders/<ORDER_ID>/customer \
  -H "x-tenant-id: cafetaria-centrum" | jq

3) Negative test: missing tenant header should return 400
curl -i -X POST http://localhost:4002/api/orders/<ORDER_ID>/customer \
  -H "Content-Type: application/json" \
  -d '{"customerId":"<CUSTOMER_ID>"}'
*/
