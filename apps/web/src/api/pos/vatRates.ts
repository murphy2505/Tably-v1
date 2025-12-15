import http from "../../services/http";

export type VatRateDTO = {
  id: string;
  name: string;
  rate: number;
};

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

const base = "/core/catalog/vat-rates";

export async function apiListVatRates(): Promise<VatRateDTO[]> {
  const res = await http.get<{ data: VatRateDTO[] }>(base, tenantHeaders());
  return res.data.data;
}
