import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { getTenantIdFromRequest } from "../../tenant";
import { validationError } from "../../lib/http";

function parseHHmmToMinutes(hhmm: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}
function isWithinSchedule(nowMin: number, startMin: number, endMin: number): boolean {
  if (startMin === endMin) return false;
  if (endMin > startMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}

export async function getWebshopStatus(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const atIso = (req.query.at as string) || undefined;
    const settings = await prisma.tenantSettings.findFirst({ where: { tenantId } });
    if (!settings) return res.json({ isOpen: false, reason: "NO_SETTINGS" });
    if (!settings.webshopEnabled) return res.json({ isOpen: false, reason: "DISABLED" });

    const at = atIso ? new Date(atIso) : new Date();
    const dow = at.getDay();
    const nowMin = at.getHours() * 60 + at.getMinutes();

    const closures = (settings.closures as any[]) || [];
    const openingHours = (settings.openingHours as any) || { days: {} };
    const dateStr = at.toISOString().slice(0, 10);

    // Closure overrides
    const closure = closures.find((c) => c.date === dateStr);
    let blocks: Array<{ start: string; end: string }> | null = null;
    let note: string | undefined = undefined;
    if (closure) {
      if (closure.closed) {
        return res.json({ isOpen: false, reason: "CLOSED_DAY", note: closure.note });
      }
      if (Array.isArray(closure.blocks)) {
        blocks = closure.blocks;
        note = closure.note;
      }
    }

    // Regular hours if no closure blocks
    if (!blocks) {
      const dayBlocks = (openingHours.days?.[String(dow)] as any[]) || [];
      blocks = dayBlocks;
    }

    // Evaluate multi-block and overnight spill from yesterday
    const isOpenToday = (blocks || []).some((b) => {
      const sm = parseHHmmToMinutes(b.start);
      const em = parseHHmmToMinutes(b.end);
      if (sm == null || em == null) return false;
      return isWithinSchedule(nowMin, sm, em);
    });

    if (isOpenToday) return res.json({ isOpen: true });

    // Check overnight spill from yesterday if no closure today
    if (!closure) {
      const y = (dow + 6) % 7;
      const yBlocks = (openingHours.days?.[String(y)] as any[]) || [];
      const spill = yBlocks.some((b) => {
        const sm = parseHHmmToMinutes(b.start);
        const em = parseHHmmToMinutes(b.end);
        if (sm == null || em == null) return false;
        return em < sm && nowMin < em;
      });
      if (spill) return res.json({ isOpen: true });
    }

    // Compute nextOpenAt (scan up to 7 days)
    let nextOpenAt: string | undefined = undefined;
    for (let add = 0; add < 7 && !nextOpenAt; add++) {
      const d = new Date(at);
      d.setDate(d.getDate() + add);
      const dd = d.getDay();
      const dStr = d.toISOString().slice(0, 10);
      const cl = closures.find((c) => c.date === dStr) || null;
      let bl: Array<{ start: string; end: string }> = [];
      if (cl) {
        if (cl.closed) continue;
        if (Array.isArray(cl.blocks)) bl = cl.blocks;
      } else {
        bl = (openingHours.days?.[String(dd)] as any[]) || [];
      }
      // choose earliest upcoming block start
      const mins = bl.map((b) => parseHHmmToMinutes(b.start)).filter((v) => v != null) as number[];
      if (mins.length) {
        const earliest = Math.min(...mins);
        const openDate = new Date(d);
        openDate.setHours(Math.floor(earliest / 60), earliest % 60, 0, 0);
        nextOpenAt = openDate.toISOString();
      }
    }

    return res.json({ isOpen: false, reason: "OUTSIDE_HOURS", nextOpenAt, note });
  } catch (err) {
    console.error("getWebshopStatus error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function getWebshopSettings(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const s = await prisma.tenantSettings.findFirst({ where: { tenantId } });
    return res.json({ data: s });
  } catch (err) {
    console.error("getWebshopSettings error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function updateWebshopSettings(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const payload = req.body || {};

    // minimal validation for openingHours/closures
    const issues: Array<{ path: (string | number)[]; message: string }> = [];
    const days = payload.openingHours?.days || {};
    for (const key of Object.keys(days)) {
      const day = Number(key);
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        issues.push({ path: ["openingHours", "days", key], message: "day 0..6" });
        continue;
      }
      const blocks = days[key] as any[];
      if (!Array.isArray(blocks)) {
        issues.push({ path: ["openingHours", "days", key], message: "blocks[]" });
        continue;
      }
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const sm = parseHHmmToMinutes(b?.start);
        const em = parseHHmmToMinutes(b?.end);
        if (sm == null || em == null) {
          issues.push({ path: ["openingHours", "days", key, i], message: "HH:mm" });
        }
        if (sm != null && em != null && sm === em) {
          issues.push({ path: ["openingHours", "days", key, i], message: "start!=end" });
        }
      }
    }
    const closures = payload.closures || [];
    if (!Array.isArray(closures)) issues.push({ path: ["closures"], message: "array" });
    if (issues.length) return validationError(res, issues);

    const s = await prisma.tenantSettings.upsert({
      where: { tenantId },
      update: {
        webshopEnabled: payload.webshopEnabled ?? true,
        webshopTimezone: payload.webshopTimezone ?? "Europe/Amsterdam",
        openingHours: payload.openingHours ?? { days: {} },
        closures: payload.closures ?? [],
        messageClosed: payload.messageClosed ?? null,
      },
      create: {
        tenantId,
        webshopEnabled: payload.webshopEnabled ?? true,
        webshopTimezone: payload.webshopTimezone ?? "Europe/Amsterdam",
        openingHours: payload.openingHours ?? { days: {} },
        closures: payload.closures ?? [],
        messageClosed: payload.messageClosed ?? null,
      },
    });
    return res.json({ data: s });
  } catch (err) {
    console.error("updateWebshopSettings error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}
