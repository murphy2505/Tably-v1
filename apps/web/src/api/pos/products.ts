import http from "../../services/http";

export type Product = {
  id: string;
  name: string;
  basePriceCents: number;
  isActive: boolean;
  productGroup?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
};

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

const base = "/core/catalog/products";

export async function apiListProducts(): Promise<Product[]> {
  const res = await http.get<{ data: Product[] }>(base, tenantHeaders());
  return res.data.data;
}

export async function apiCreateProduct(payload: {
  name: string;
  basePriceCents: number;
  isActive?: boolean;
  categoryId?: string | null;
  productGroupId?: string | null;
}): Promise<Product> {
  const res = await http.post<{ data: Product }>(base, payload, tenantHeaders());
  return res.data.data;
}

export async function apiUpdateProduct(
  id: string,
  payload: Partial<{
    name: string;
    basePriceCents: number;
    isActive: boolean;
    categoryId: string | null;
    productGroupId: string | null;
  }>
): Promise<Product> {
  const res = await http.put<{ data: Product }>(`${base}/${id}`, payload, tenantHeaders());
  return res.data.data;
}

export async function apiDeleteProduct(id: string): Promise<void> {
  await http.delete(`${base}/${id}`, tenantHeaders());
}
