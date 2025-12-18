import { prisma } from "../../lib/prisma";

function formatDateCode(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}${m}${d}`; // YYYYMMDD
}

function formatShortDate(date: Date): string {
  // yyMMdd, e.g., 241218
  const yy = (date.getFullYear() % 100).toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${yy}${m}${d}`;
}

export async function issueReceiptNumber(tenantId: string, orderId: string, now = new Date()) {
  return prisma.$transaction(async (tx: any) => {
    return issueReceiptNumberTx(tx, tenantId, orderId, now);
  });
}

export async function issueReceiptNumberTx(tx: any, tenantId: string, orderId: string, now = new Date()) {
  // Check if already issued to avoid double assignment
  const current = await tx.order.findFirst({ where: { id: orderId, tenantId } });
  if (!current) throw new Error("ORDER_NOT_FOUND");
  if (current.receiptIssuedAt) return current; // already has a receipt

  const dateCode = formatDateCode(now);
  // Defensive guard: ensure Prisma Client includes ReceiptSequence delegate
  if (!tx.receiptSequence) {
    throw new Error("PRISMA_CLIENT_OUTDATED: receiptSequence delegate missing. Run prisma generate with correct schema.");
  }
  const seq = await tx.receiptSequence.upsert({
    where: { tenantId_dateCode: { tenantId, dateCode } as any },
    update: { nextSeq: { increment: 1 } },
    create: { tenantId, dateCode, nextSeq: 2 },
  } as any);
  const issuedNo = (seq.nextSeq || 2) - 1;

  // Optional prefix from settings
  const settings = await tx.tenantSettings.findFirst({ where: { tenantId } });
  const prefix = settings?.receiptPrefix?.trim() || "";
  const shortDate = formatShortDate(now);
  const label = `${prefix ? prefix + '-' : ''}${shortDate}-${String(issuedNo).padStart(3, '0')}`;

  const updated = await tx.order.update({
    where: { id: orderId },
    data: { receiptNo: issuedNo, receiptLabel: label, receiptIssuedAt: now },
    include: { lines: true },
  });
  return updated;
}
