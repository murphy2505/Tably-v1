import http from "../../services/http";

export type VatRateDTO = {
  id: string;
  name: string;
  rate: number;
};

// tenantHeaders() removed — tenant is injected by http.ts interceptor

const base = "/core/catalog/vat-rates";

export async function apiListVatRates(): Promise<VatRateDTO[]> {
  const res = await http.get<{ data: VatRateDTO[] }>(base);
  return res.data.data;
}
