import http from "../services/http";

function tenantHeaders() {
  const tenantId = (import.meta as any).env?.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export type PrinterDTO = {
  id: string;
  name: string;
  driver: "ESC_POS_TCP" | "STAR_ESC_POS_TCP" | "EPOS_HTTP" | "STARPRNT";
  host: string;
  port: number;
  httpUrl?: string | null;
  paperWidth: 80 | 58;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listPrinters(): Promise<PrinterDTO[]> {
  const res = await http.get<{ printers: PrinterDTO[] }>("/core/printers", tenantHeaders());
  return res.data.printers;
}

export async function createPrinter(payload: Partial<PrinterDTO> & { name: string; driver: PrinterDTO["driver"]; host: string }): Promise<PrinterDTO> {
  const res = await http.post<{ printer: PrinterDTO }>("/core/printers", payload, tenantHeaders());
  return res.data.printer;
}

export async function updatePrinter(id: string, payload: Partial<PrinterDTO>): Promise<PrinterDTO> {
  const res = await http.put<{ printer: PrinterDTO }>(`/core/printers/${id}`, payload, tenantHeaders());
  return res.data.printer;
}

export async function deletePrinter(id: string): Promise<void> {
  await http.delete(`/core/printers/${id}`, tenantHeaders());
}

export type PrintConfigDTO = {
  id: string;
  name: string;
  template: "CUSTOMER_RECEIPT" | "KITCHEN_TICKET" | "QR_CARD";
  plan: "NEVER" | "ON_PAY" | "ON_SEND_TO_KDS" | "MANUAL";
  targetPrinters: string[];
  channels: Array<"POS" | "WEB" | "TAKEAWAY" | "DELIVERY">;
  areas: string[];
  prepStations: string[];
  ignoreLinesWithoutPrepStation: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listPrintConfigs(): Promise<PrintConfigDTO[]> {
  const res = await http.get<{ configs: PrintConfigDTO[] }>("/core/print-configs", tenantHeaders());
  return res.data.configs;
}

export async function createPrintConfig(payload: Omit<PrintConfigDTO, "id" | "createdAt" | "updatedAt">): Promise<PrintConfigDTO> {
  const res = await http.post<{ config: PrintConfigDTO }>("/core/print-configs", payload, tenantHeaders());
  return res.data.config;
}

export async function updatePrintConfig(id: string, payload: Partial<PrintConfigDTO>): Promise<PrintConfigDTO> {
  const res = await http.put<{ config: PrintConfigDTO }>(`/core/print-configs/${id}`, payload, tenantHeaders());
  return res.data.config;
}

export async function deletePrintConfig(id: string): Promise<void> {
  await http.delete(`/core/print-configs/${id}`, tenantHeaders());
}

export async function testPrint(payload?: { host?: string; port?: number }): Promise<void> {
  await http.post("/print/test-escpos", payload ?? {}, tenantHeaders());
}
