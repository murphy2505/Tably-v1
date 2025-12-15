import http from "../../services/http";

export type CategoryDTO = {
  id: string;
  name: string;
  sortOrder?: number | null;
  isActive: boolean;
  defaultVatRateId?: string | null;
};

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

const base = "/core/catalog/categories";

export async function apiListCategories(): Promise<CategoryDTO[]> {
  const res = await http.get<{ data: CategoryDTO[] }>(base, tenantHeaders());
  return res.data.data;
}

export async function apiCreateCategory(payload: { name: string; sortOrder?: number; isActive?: boolean; defaultVatRateId?: string | null }): Promise<CategoryDTO> {
  const res = await http.post<{ data: CategoryDTO }>(base, payload, tenantHeaders());
  return res.data.data;
}

export async function apiUpdateCategory(id: string, payload: Partial<{ name: string; sortOrder: number; isActive: boolean; defaultVatRateId?: string | null }>): Promise<CategoryDTO> {
  const res = await http.put<{ data: CategoryDTO }>(`${base}/${id}`, payload, tenantHeaders());
  return res.data.data;
}

export async function apiDeleteCategory(id: string): Promise<void> {
  await http.delete(`${base}/${id}`, tenantHeaders());
}
