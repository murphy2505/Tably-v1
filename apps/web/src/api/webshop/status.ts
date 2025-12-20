import http from "../../services/http";

export type WebshopStatus = {
  isOpen: boolean;
  reason?: string;
  nextOpenAt?: string;
  note?: string;
};

// tenantHeaders() removed — tenant is injected by http.ts interceptor

export async function apiGetWebshopStatus(at?: string): Promise<WebshopStatus> {
  const res = await http.get<WebshopStatus>("/core/webshop/status", { params: { at } });
  return res.data as any;
}
