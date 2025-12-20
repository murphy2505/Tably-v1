// Use global fetch in Node 18+

export type SumupCheckout = {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | string;
  amount: number;
  currency: string;
  reference?: string;
  description?: string;
};

function resolveAuthToken(): { token: string; source: "ACCESS_TOKEN" | "API_KEY" } {
  const tokenEnv = process.env.SUMUP_ACCESS_TOKEN || "";
  const apiKeyEnv = process.env.SUMUP_API_KEY || "";
  if (tokenEnv) return { token: tokenEnv, source: "ACCESS_TOKEN" };
  if (apiKeyEnv) return { token: apiKeyEnv, source: "API_KEY" };
  throw new Error("SUMUP_API_KEY_REQUIRED");
}

function authHeader(): Record<string, string> {
  const { token } = resolveAuthToken();
  return { Authorization: `Bearer ${token}` };
}

async function http<T>(path: string, init: any): Promise<T> {
  const base = "https://api.sumup.com";
  const res = await fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers as any), ...authHeader() },
  } as any);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SUMUP_HTTP_${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function createCheckout(input: { amountCents: number; currency?: string; reference: string; description?: string }): Promise<SumupCheckout> {
  const currency = input.currency || "EUR";
  const amount = (input.amountCents / 100);
  const body = {
    amount,
    currency,
    checkout_reference: input.reference,
    checkout_description: input.description || input.reference,
  } as any;
  const data = await http<any>(`/v0.1/checkouts`, { method: "POST", body: JSON.stringify(body) });
  return {
    id: data?.id || data?.checkout_id || data?.uuid || "",
    status: (data?.status || "PENDING").toUpperCase(),
    amount: Number(data?.amount ?? amount),
    currency: String(data?.currency ?? currency),
    reference: String(data?.checkout_reference ?? input.reference),
    description: String(data?.checkout_description ?? input.description ?? input.reference),
  };
}

export async function getCheckout(checkoutId: string): Promise<SumupCheckout> {
  const data = await http<any>(`/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, { method: "GET" });
  return {
    id: data?.id || data?.checkout_id || checkoutId,
    status: (data?.status || "PENDING").toUpperCase(),
    amount: Number(data?.amount ?? 0),
    currency: String(data?.currency ?? "EUR"),
    reference: String(data?.checkout_reference ?? ""),
    description: String(data?.checkout_description ?? ""),
  };
}
