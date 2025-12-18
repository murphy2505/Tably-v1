import type { Request } from "express";

// Returns DEFAULT_TENANT_ID from env or empty string if not set.
export function getTenantId(): string {
  return process.env.DEFAULT_TENANT_ID?.trim() || "";
}

// Resolve tenant from request header. In development, falls back to DEFAULT_TENANT_ID.
// In production, returns empty string when header is missing, allowing caller to respond 400.
export function getTenantIdFromRequest(req: Request): string {
  const override = req.header("x-tenant-id")?.trim();
  if (override) return override;
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return ""; // no fallback in production
  return getTenantId(); // dev fallback
}
