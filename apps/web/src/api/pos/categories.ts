import axios from "axios";

export type CategoryDTO = {
  id: string;
  name: string;
  sortOrder?: number | null;
  isActive: boolean;
};

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

const base = "/pos-api/core/catalog/categories";

export async function apiListCategories(): Promise<CategoryDTO[]> {
  const res = await axios.get<{ data: CategoryDTO[] }>(base, tenantHeaders());
  return res.data.data;
}

export async function apiCreateCategory(payload: { name: string; sortOrder?: number; isActive?: boolean }): Promise<CategoryDTO> {
  const res = await axios.post<{ data: CategoryDTO }>(base, payload, tenantHeaders());
  return res.data.data;
}

export async function apiUpdateCategory(id: string, payload: Partial<{ name: string; sortOrder: number; isActive: boolean }>): Promise<CategoryDTO> {
  const res = await axios.put<{ data: CategoryDTO }>(`${base}/${id}`, payload, tenantHeaders());
  return res.data.data;
}

export async function apiDeleteCategory(id: string): Promise<void> {
  await axios.delete(`${base}/${id}`, tenantHeaders());
}
