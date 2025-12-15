import type { AxiosRequestConfig } from "axios";
import http from "../../services/http";

export type ProductGroupDTO = {
  id: string;
  name: string;
  code?: string;
  vatRateId?: string | null;
  isActive?: boolean;
};

function clientConfig(): AxiosRequestConfig {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

// NOTE: backend mount is /core/catalog (see apps/api/src/server.ts)
const base = "/core/catalog/product-groups";

export async function apiListProductGroups() {
  const res = await http.get<{ data: ProductGroupDTO[] }>(base, clientConfig());
  return res.data.data;
}

export async function apiCreateProductGroup(payload: Omit<ProductGroupDTO, "id"> & { revenueGroupId?: string }) {
  const res = await http.post<{ data: ProductGroupDTO }>(base, payload, clientConfig());
  return res.data.data;
}

export async function apiUpdateProductGroup(
  id: string,
  payload: Partial<Omit<ProductGroupDTO, "id"> & { revenueGroupId?: string }>
) {
  const res = await http.put<{ data: ProductGroupDTO }>(`${base}/${id}`, payload, clientConfig());
  return res.data.data;
}

export async function apiDeleteProductGroup(id: string) {
  const res = await http.delete<{ data: ProductGroupDTO }>(`${base}/${id}`, clientConfig());
  return res.data.data;
}
