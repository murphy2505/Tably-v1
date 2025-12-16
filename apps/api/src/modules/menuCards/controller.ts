import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { getTenantIdFromRequest } from "../../tenant";
import { notFound, validationError } from "../../lib/http";

function channelMatches(reqChannel: string, cardChannel: string): boolean {
  if (reqChannel === "POS") return cardChannel === "POS" || cardChannel === "BOTH";
  if (reqChannel === "WEB") return cardChannel === "WEB" || cardChannel === "BOTH";
  return true;
}

function isActiveBySchedule(card: any, at: Date): boolean {
  const enabled = (card.schedules || []).filter((s: any) => s.enabled);
  if (enabled.length === 0) return true;
  const dow = at.getDay(); // 0..6 Sun..Sat
  const nowStr = at.toTimeString().slice(0, 5);
  return enabled.some((s: any) => s.dayOfWeek === dow && s.startTime <= nowStr && nowStr <= s.endTime);
}

export async function listMenuCards(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const data = await prisma.menuCard.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
      include: {
        schedules: true,
        items: { include: { product: { include: { vatRate: true } }, variant: true } },
      },
    });
    return res.json({ data });
  } catch (err) {
    console.error("listMenuCards error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function activeMenuCards(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const channel = (req.query.channel as string) || "POS";
    const atIso = (req.query.at as string) || undefined;
    const at = atIso ? new Date(atIso) : new Date();

    const cards = await prisma.menuCard.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        schedules: true,
        items: { include: { product: { include: { vatRate: true } }, variant: true } },
      },
    });

    const active = (cards as any[]).filter((c: any) => channelMatches(channel, c.channel) && isActiveBySchedule(c, at));

    return res.json({ menuCards: active.map((c: any) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      sortOrder: c.sortOrder,
      items: (c.items as any[]).map((it: any) => ({
        id: it.id,
        sortOrder: it.sortOrder,
        product: it.product ? {
          id: it.product.id,
          name: it.product.name,
          description: it.product.description,
          imageUrl: it.product.imageUrl,
          vatRateBps: ((it.product.vatRate?.rate ?? 21) * 100),
          allergenTags: it.product.allergenTags,
        } : null,
        variant: it.variant ? { id: it.variant.id, name: it.variant.name } : null,
        priceCents: (it.variant?.priceOverrideCents ?? it.product?.basePriceCents ?? 0),
      }))
    })) });
  } catch (err) {
    console.error("activeMenuCards error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function createMenuCard(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!req.body?.name) return validationError(res, [{ path: ["name"], message: "Required" }]);
    const card = await prisma.menuCard.create({
      data: {
        tenantId,
        name: req.body.name,
        channel: req.body.channel ?? "BOTH",
        isActive: req.body.isActive ?? true,
        sortOrder: req.body.sortOrder ?? 0,
      },
    });
    return res.json({ data: card });
  } catch (err) {
    console.error("createMenuCard error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function updateMenuCard(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;
    const existing = await prisma.menuCard.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const card = await prisma.menuCard.update({
      where: { id },
      data: {
        name: req.body.name ?? existing.name,
        channel: req.body.channel ?? existing.channel,
        isActive: req.body.isActive ?? existing.isActive,
        sortOrder: req.body.sortOrder ?? existing.sortOrder,
      },
    });
    return res.json({ data: card });
  } catch (err) {
    console.error("updateMenuCard error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function addSchedule(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;
    const existing = await prisma.menuCard.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const details: Array<{ path: (string | number)[]; message: string }> = [];
    const dayOfWeek = req.body?.dayOfWeek;
    const startTime = req.body?.startTime;
    const endTime = req.body?.endTime;
    if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) details.push({ path: ["dayOfWeek"], message: "0..6" });
    if (!startTime) details.push({ path: ["startTime"], message: "Required" });
    if (!endTime) details.push({ path: ["endTime"], message: "Required" });
    if (details.length) return validationError(res, details);

    const sched = await prisma.menuCardSchedule.create({
      data: { tenantId, menuCardId: id, enabled: req.body.enabled ?? true, dayOfWeek, startTime, endTime },
    });
    return res.json({ data: sched });
  } catch (err) {
    console.error("addSchedule error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function deleteSchedule(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;
    const scheduleId = req.params.scheduleId;
    const sched = await prisma.menuCardSchedule.findFirst({ where: { id: scheduleId, tenantId, menuCardId: id } });
    if (!sched) return notFound(res);
    const del = await prisma.menuCardSchedule.delete({ where: { id: scheduleId } });
    return res.json({ data: del });
  } catch (err) {
    console.error("deleteSchedule error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}
