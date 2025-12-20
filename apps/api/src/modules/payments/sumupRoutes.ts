import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { getTenantIdFromRequest } from "../../tenant";
import { createCheckout, getCheckout } from "../../services/sumup/sumupClient";

export const sumupRouter = Router();

sumupRouter.post("/checkout", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const { orderId } = (req.body || {}) as { orderId?: string };
    if (!orderId) return res.status(400).json({ error: { message: "VALIDATION_ERROR", details: { orderId } } });
    if (!tenantId) return res.status(400).json({ error: { message: "TENANT_REQUIRED" } });

    if (!prisma) throw new Error("PRISMA_NOT_INITIALIZED");
    const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) {
      let foundTenantId: string | undefined = undefined;
      try {
        const anyOrder = await prisma.order.findFirst({ where: { id: orderId } });
        if (anyOrder) foundTenantId = (anyOrder as any).tenantId;
      } catch {}
      return res.status(404).json({ error: { message: "ORDER_NOT_FOUND", details: { orderId, tenantId, foundTenantId } } });
    }

    const amountCents = order.totalInclVatCents || order.subtotalExclVatCents || 0;
    const reference = `${tenantId}:${orderId}`;
    const description = `Order ${order.receiptLabel || order.draftLabel || orderId}`;

    // Idempotency: if a checkout was already created for this order, reuse its provider checkout id stored on the order
    if ((order as any).paymentRef) {
      console.log("[sumup] create", { tenantId, orderId, amountCents, reused: true, checkoutId: (order as any).paymentRef });
      return res.json({ providerCheckoutId: (order as any).paymentRef, status: order.status });
    }

    const checkout = await createCheckout({ amountCents, currency: "EUR", reference, description });
    // Store the provider checkout id on the order for reuse/polling
    await prisma.order.update({ where: { id: orderId }, data: { paymentRef: checkout.id } });

    console.log("[sumup] create", {
      tenantId,
      orderId,
      amountCents,
      reused: false,
      checkoutId: checkout.id,
    });

    res.json({ providerCheckoutId: checkout.id, status: checkout.status });
  } catch (e: any) {
    res.status(500).json({ error: { message: "SUMUP_FAILED", details: e?.message || String(e) } });
  }
});

sumupRouter.get("/checkout/:providerCheckoutId", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const providerCheckoutId = String(req.params.providerCheckoutId);
    if (!prisma) throw new Error("PRISMA_NOT_INITIALIZED");
    const checkout = await getCheckout(providerCheckoutId);

    // Try to find the order by stored paymentRef (provider checkout id)
    let order = await prisma.order.findFirst({ where: { tenantId, paymentRef: providerCheckoutId } });
    // Fallback: parse reference to derive orderId, then attach paymentRef if missing
    if (!order) {
      const ref = checkout.reference || "";
      const parts = ref.split(":");
      const orderId = parts.length >= 2 ? parts[1] : "";
      if (orderId) {
        order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
        if (order && !order.paymentRef) {
          await prisma.order.update({ where: { id: orderId }, data: { paymentRef: providerCheckoutId } });
        }
      }
    }

    console.log("[sumup] poll", {
      tenantId,
      checkoutId: providerCheckoutId,
      prevStatus: order?.status,
      nextStatus: checkout.status,
      orderId: order?.id,
    });

    if (checkout.status === "PAID" && order?.id) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" as any, paidAt: new Date(), paymentMethod: "CARD", paymentRef: providerCheckoutId } });
    }

    res.json({ providerCheckoutId, status: checkout.status });
  } catch (e: any) {
    res.status(500).json({ error: { message: "SUMUP_FAILED", details: e?.message || String(e) } });
  }
});

export default sumupRouter;
