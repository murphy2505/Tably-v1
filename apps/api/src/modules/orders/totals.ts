import { prisma } from "../../lib/prisma";

type VatBucket = {
  rateBps: number;
  grossCents: number;
  netCents: number;
  vatCents: number;
};

function computeNetFromGrossBps(grossCents: number, rateBps: number): number {
  // net = gross * 10000 / (10000 + rateBps), rounded to nearest cent
  const numerator = grossCents * 10000;
  const denom = 10000 + rateBps;
  return Math.round(numerator / denom);
}

export async function calculateAndPersistOrderTotals(tenantId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId }, include: { lines: true } });
  if (!order) return null;

  // Group gross by VAT rate
  const buckets = new Map<number, number>(); // rateBps -> grossCents
  for (const l of order.lines) {
    const gross = (l.qty || 0) * (l.priceCents || 0);
    const rate = (l as any).vatRateBps ?? 2100;
    buckets.set(rate, (buckets.get(rate) || 0) + gross);
  }

  const breakdown: Record<string, VatBucket> = {};
  let totalGross = 0;
  let totalNet = 0;
  for (const [rateBps, grossCents] of buckets.entries()) {
    const netCents = computeNetFromGrossBps(grossCents, rateBps);
    const vatCents = grossCents - netCents;
    totalGross += grossCents;
    totalNet += netCents;
    breakdown[String(rateBps)] = { rateBps, grossCents, netCents, vatCents };
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotalExclVatCents: totalNet,
      totalInclVatCents: totalGross,
      vatBreakdown: breakdown as any,
    },
    include: { lines: true },
  });
  return updated;
}
