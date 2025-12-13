export function getTenantId(): string {
  const id = process.env.DEFAULT_TENANT_ID || "cafetaria-centrum";
  if (!id) throw new Error("DEFAULT_TENANT_ID missing");
  return id;
}
