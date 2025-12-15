import { Router } from "express";
import { asyncHandler, validationError, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

export const ordersRouter = Router();

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

  const parsed = TransitionBody.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  const { to } = parsed.data;

  const id = String(req.params.id);
  const existing = await prisma.order.findFirst({ where: { id, tenantId }, include: { lines: true } });
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
  return res.json({ order: updated });
}));
