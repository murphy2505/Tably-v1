import http from "../../services/http";

export type TaxRateDTO = {
  id: string;
  name: string;
  rate: number;
};

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

const base = "/core/tax-rates";

export async function apiListTaxRates(): Promise<TaxRateDTO[]> {
  const res = await http.get<{ data: TaxRateDTO[] }>(base, tenantHeaders());
  return res.data.data;
}
