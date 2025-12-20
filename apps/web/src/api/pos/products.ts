import http from "../../services/http";

export type Product = {
  id: string;
  name: string;
  basePriceCents: number;
  isActive: boolean;
  productGroup?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  vatRateId?: string | null;
  vatRate?: { id: string; name: string; rate: number } | null;
};

// tenantHeaders() removed — tenant is injected by http.ts interceptor

const base = "/core/catalog/products";

export async function apiListProducts(): Promise<Product[]> {
  const res = await http.get<any>(base);
  const products: Product[] = res.data?.products ?? res.data?.data ?? [];
  return products;
}

export async function apiGetProduct(id: string): Promise<Product> {
  const res = await http.get<any>(`${base}/${id}`);
  return res.data?.data ?? res.data?.product;
}

export async function apiCreateProduct(payload: {
  name: string;
  basePriceCents: number;
  isActive?: boolean;
  categoryId?: string | null;
  productGroupId?: string | null;
  vatRateId?: string | null;
}): Promise<Product> {
  const res = await http.post<any>(base, payload);
  return res.data?.data ?? res.data?.product;
}

export async function apiUpdateProduct(
  id: string,
  payload: Partial<{
    name: string;
    basePriceCents: number;
    isActive: boolean;
    categoryId: string | null;
    productGroupId: string | null;
    vatRateId?: string | null;
  }>
): Promise<Product> {
  const res = await http.put<any>(`${base}/${id}`, payload);
  return res.data?.data ?? res.data?.product;
}

export async function apiDeleteProduct(id: string): Promise<void> {
  await http.delete(`${base}/${id}`);
}
