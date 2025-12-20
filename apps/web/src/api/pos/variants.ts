import http from "../../services/http";

export type VariantDTO = {
  id: string;
  productId: string;
  name: string;
  priceOverrideCents?: number | null;
  sortOrder?: number | null;
  isActive: boolean;
};

// tenantHeaders() removed — tenant is injected by http.ts interceptor

const base = "/core/catalog/variants";

export async function apiListVariants(productId: string): Promise<VariantDTO[]> {
  const res = await http.get<{ data: VariantDTO[] }>(`${base}?productId=${encodeURIComponent(productId)}`);
  return res.data.data;
}

export async function apiCreateVariant(payload: {
  productId: string;
  name: string;
  priceOverrideCents?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<VariantDTO> {
  const res = await http.post<{ data: VariantDTO }>(base, payload);
  return res.data.data;
}

export async function apiUpdateVariant(
  id: string,
  payload: Partial<{
    name: string;
    priceOverrideCents?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  }>
): Promise<VariantDTO> {
  const res = await http.put<{ data: VariantDTO }>(`${base}/${id}`, payload);
  return res.data.data;
}

export async function apiDeleteVariant(id: string): Promise<void> {
  await http.delete(`${base}/${id}`);
}
