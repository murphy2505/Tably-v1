import http from "../../services/http";

export type WebshopStatus = {
  isOpen: boolean;
  reason?: string;
  nextOpenAt?: string;
  note?: string;
};

function tenantHeaders() {
  const tenantId = (import.meta as any).env?.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export async function apiGetWebshopStatus(at?: string): Promise<WebshopStatus> {
  const res = await http.get<WebshopStatus>("/core/webshop/status", { ...tenantHeaders(), params: { at } });
  return res.data as any;
}
