import http from "../services/http";

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export async function apiPrintReceipt(orderId: string): Promise<void> {
  try {
    await http.post(`/print/receipt`, { orderId }, tenantHeaders());
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

export async function apiPrintTest(): Promise<void> {
  try {
    await http.post(`/print/test`, {}, tenantHeaders());
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || "PRINT_FAILED";
    throw new Error(`Test print mislukt: ${msg}`);
  }
}

export async function apiPrintLastReceipt(): Promise<string | null> {
  try {
    const res = await http.post(`/print/receipt/last`, {}, tenantHeaders());
    return res.data?.orderId || null;
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || "PRINT_FAILED";
    throw new Error(msg);
  }
}

export async function apiPrintTestKind(kind: "RECEIPT" | "QR_CARD" | "KITCHEN" | "BAR"): Promise<void> {
  try {
    await http.post(`/print/test-kind`, { kind }, tenantHeaders());
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || "PRINT_FAILED";
    throw new Error(msg);
  }
}
