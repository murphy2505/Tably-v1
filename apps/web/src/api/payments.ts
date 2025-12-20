import http from "../services/http";

export type SumupCheckoutResponse = { paymentId?: string; providerCheckoutId: string; status: string };

export async function sumupCreateCheckout(orderId: string): Promise<SumupCheckoutResponse> {
  if ((import.meta as any).env?.DEV) {
    try { console.log("[sumup] payload", { orderId }); } catch {}
  }
  const res = await http.post<SumupCheckoutResponse>("/payments/sumup/checkout", { orderId });
  return res.data;
}

export async function sumupPollCheckout(providerCheckoutId: string): Promise<{ status: string; providerCheckoutId: string; paymentId?: string }> {
  const res = await http.get<{ status: string; providerCheckoutId: string; paymentId?: string }>(`/payments/sumup/checkout/${providerCheckoutId}`);
  return res.data;
}
