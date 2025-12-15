import http from "../../services/http";

export type VariantDTO = {
  id: string;
  productId: string;
  name: string;
  priceOverrideCents?: number | null;
  sortOrder?: number | null;
  isActive: boolean;
};

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

const base = "/core/catalog/variants";

export async function apiListVariants(productId: string): Promise<VariantDTO[]> {
  const res = await http.get<{ data: VariantDTO[] }>(`${base}?productId=${encodeURIComponent(productId)}`, tenantHeaders());
  return res.data.data;
}

export async function apiCreateVariant(payload: {
  productId: string;
  name: string;
  priceOverrideCents?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<VariantDTO> {
  const res = await http.post<{ data: VariantDTO }>(base, payload, tenantHeaders());
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
  const res = await http.put<{ data: VariantDTO }>(`${base}/${id}`, payload, tenantHeaders());
  return res.data.data;
}

export async function apiDeleteVariant(id: string): Promise<void> {
  await http.delete(`${base}/${id}`, tenantHeaders());
}
