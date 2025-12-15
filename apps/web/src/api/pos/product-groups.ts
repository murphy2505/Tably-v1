import type { AxiosRequestConfig } from "axios";
import axios from "axios";

export type ProductGroupDTO = {
  id: string;
  name: string;
  code?: string;
  vatRate: "HIGH" | "LOW" | "ZERO";
  isActive?: boolean;
};

function clientConfig(): AxiosRequestConfig {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "demo-tenant";
  return { headers: { "x-tenant-id": tenantId } };
}

// NOTE: backend mount is /core/catalog (see apps/api/src/server.ts)
const base = "/pos-api/core/catalog/product-groups";

export async function apiListProductGroups() {
  const res = await axios.get<{ data: ProductGroupDTO[] }>(base, clientConfig());
  return res.data.data;
}

export async function apiCreateProductGroup(payload: Omit<ProductGroupDTO, "id"> & { revenueGroupId?: string }) {
  const res = await axios.post<{ data: ProductGroupDTO }>(base, payload, clientConfig());
  return res.data.data;
}

export async function apiUpdateProductGroup(
  id: string,
  payload: Partial<Omit<ProductGroupDTO, "id"> & { revenueGroupId?: string }>
) {
  const res = await axios.put<{ data: ProductGroupDTO }>(`${base}/${id}`, payload, clientConfig());
  return res.data.data;
}

export async function apiDeleteProductGroup(id: string) {
  const res = await axios.delete<{ data: ProductGroupDTO }>(`${base}/${id}`, clientConfig());
  return res.data.data;
}
