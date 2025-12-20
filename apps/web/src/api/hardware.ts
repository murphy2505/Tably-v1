import axios from "axios";

const http = axios.create({ baseURL: "/api", withCredentials: true });

function tenantHeaders() {
  const tenantId = (import.meta as any).env?.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export type Vendor = "STAR" | "EPSON" | "GENERIC_ESCPOS";
export type PrintKind = "RECEIPT" | "QR_CARD" | "KITCHEN" | "BAR";

export type HwPrinter = {
  id: string;
  name: string;
  vendor: Vendor;
  host: string;
  port: number;
  paperWidthMm: 58 | 80;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function hwListPrinters(): Promise<HwPrinter[]> {
  const res = await http.get<{ printers: HwPrinter[] }>("/hardware/printers", tenantHeaders());
  return res.data.printers;
}

export async function hwCreatePrinter(payload: Partial<HwPrinter> & { name: string; vendor: Vendor; host: string }): Promise<HwPrinter> {
  const res = await http.post<{ printer: HwPrinter }>("/hardware/printers", payload, tenantHeaders());
  return res.data.printer;
}

export async function hwUpdatePrinter(id: string, payload: Partial<HwPrinter>): Promise<HwPrinter> {
  const res = await http.patch<{ printer: HwPrinter }>(`/hardware/printers/${id}`, payload, tenantHeaders());
  return res.data.printer;
}

export async function hwDeletePrinter(id: string): Promise<void> {
  await http.delete(`/hardware/printers/${id}`, tenantHeaders());
}

export async function hwTestPrinter(id: string): Promise<void> {
  await http.post(`/hardware/printers/${id}/test`, {}, tenantHeaders());
}

export type PrintRouteDTO = { id: string; kind: PrintKind; printerId: string; isDefault: boolean };

export async function hwGetRoutes(): Promise<PrintRouteDTO[]> {
  const res = await http.get<{ routes: PrintRouteDTO[] }>("/hardware/print-routes", tenantHeaders());
  return res.data.routes;
}

export async function hwPutRoutes(routes: Array<{ kind: PrintKind; printerId: string; isDefault?: boolean }>): Promise<PrintRouteDTO[]> {
  const res = await http.put<{ routes: PrintRouteDTO[] }>("/hardware/print-routes", { routes }, tenantHeaders());
  return res.data.routes;
}
