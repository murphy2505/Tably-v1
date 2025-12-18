import { prisma } from "../../lib/prisma";

function formatDateCode(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}${m}${d}`; // YYYYMMDD
}

export async function issueDraftNumberTx(tx: any, tenantId: string, orderId: string, now = new Date()) {
  const current = await tx.order.findFirst({ where: { id: orderId, tenantId } });
  if (!current) throw new Error("ORDER_NOT_FOUND");
  if (current.draftIssuedAt) return current; // already has a draft number

  const dateCode = formatDateCode(now);
  if (!tx.orderSequence) {
    throw new Error("PRISMA_CLIENT_OUTDATED: orderSequence delegate missing. Run prisma generate with correct schema.");
  }
  const seq = await tx.orderSequence.upsert({
    where: { tenantId_dateCode: { tenantId, dateCode } as any },
    update: { nextSeq: { increment: 1 } },
    create: { tenantId, dateCode, nextSeq: 2 },
  } as any);
  const issuedNo = (seq.nextSeq || 2) - 1;
  const label = String(issuedNo); // No prefix for draft numbers per requirements

  const updated = await tx.order.update({
    where: { id: orderId },
    data: { draftNo: issuedNo, draftLabel: label, draftIssuedAt: now },
    include: { lines: true },
  });
  return updated;
}

export async function issueDraftNumber(tenantId: string, orderId: string, now = new Date()) {
  return prisma.$transaction(async (tx: any) => {
    return issueDraftNumberTx(tx, tenantId, orderId, now);
  });
}
