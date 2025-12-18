import type { Request, Response, NextFunction } from "express";
import { prisma } from "./lib/prisma";
import { getTenantIdFromRequest } from "./tenant";
import { internalServerError } from "./lib/http";

export async function ensureTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (tenantId) {
      await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {},
        create: { id: tenantId, name: tenantId }
      });
    }
    next();
  } catch (_e) {
    internalServerError(res);
  }
}
