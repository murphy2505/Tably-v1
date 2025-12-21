import http from "../services/http";

export type LoyaltyAccountDTO = {
  id: string;
  points: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  tier?: string | null;
};

export type CustomerDTO = {
  id: string;
  tenantId?: string;
  name?: string | null;
  phoneE164?: string | null;
  email?: string | null;
  isActive?: boolean;
  loyalty?: LoyaltyAccountDTO | null;
};

export async function apiSearchCustomers(query: string, take: number = 20): Promise<{ customers: CustomerDTO[] }> {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (take) params.set("take", String(take));
  const qs = params.toString() ? `?${params.toString()}` : "";
  // Use relative path so axios baseURL "/api" is applied → "/api/loyalty/customers"
  const res = await http.get<{ customers: CustomerDTO[] }>(`loyalty/customers${qs}`);
  return res.data;
}

export async function apiCreateCustomer(payload: { name?: string; phoneE164?: string; email?: string }): Promise<CustomerDTO> {
  // Use relative path → "/api/loyalty/customers"
  const res = await http.post<{ customer: CustomerDTO }>(`loyalty/customers`, payload);
  return res.data.customer;
}
