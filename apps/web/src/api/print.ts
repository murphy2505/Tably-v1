import http from "../services/http";

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export async function apiPrintOrder(orderId: string, ip?: string): Promise<void> {
  try {
    const payload = ip ? { ip } : {};
    await http.post(`/print/order/${orderId}`, payload, tenantHeaders());
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || "PRINT_FAILED";
    throw new Error(`Bon printen mislukt: ${msg}`);
  }
}

export async function apiPrintQr(
  qrText: string,
  opts?: { ip?: string; title?: string; subtitle?: string; footer?: string }
): Promise<void> {
  try {
    const payload: any = { qrText };
    if (opts?.ip) payload.ip = opts.ip;
    if (opts?.title) payload.title = opts.title;
    if (opts?.subtitle) payload.subtitle = opts.subtitle;
    if (opts?.footer) payload.footer = opts.footer;
    await http.post(`/print/epson/qr`, payload, tenantHeaders());
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || "PRINT_FAILED";
    throw new Error(`QR printen mislukt: ${msg}`);
  }
}
