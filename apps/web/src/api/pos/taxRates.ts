import http from "../../services/http";

export type TaxRateDTO = {
  id: string;
  name: string;
  rate: number;
};

// tenantHeaders() removed — tenant is injected by http.ts interceptor

const base = "/core/tax-rates";

export async function apiListTaxRates(): Promise<TaxRateDTO[]> {
  const res = await http.get<{ data: TaxRateDTO[] }>(base);
  return res.data.data;
}
