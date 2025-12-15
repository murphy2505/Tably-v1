import axios from "axios";

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

const base = "/pos-api/core/catalog/products";

export async function apiListProducts(): Promise<Product[]> {
  const res = await axios.get<{ data: Product[] }>(base, tenantHeaders());
  return res.data.data;
}
