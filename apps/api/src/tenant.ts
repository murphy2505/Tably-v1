import type { Request } from "express";

export function getTenantId(): string {
  const id = process.env.DEFAULT_TENANT_ID?.trim();
  if (!id) throw new Error("DEFAULT_TENANT_ID missing");
  return id;
}

export function getTenantIdFromRequest(req: Request): string {
  const override = req.header("x-tenant-id")?.trim();
  if (override) return override;
  return getTenantId();
}
