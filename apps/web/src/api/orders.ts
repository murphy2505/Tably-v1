import http from "../services/http";
import type { OrderDTO } from "./pos/orders";

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export type OrderListItem = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalInclVatCents: number;
  receiptLabel?: string | null;
  receiptIssuedAt?: string | null;
  draftLabel?: string | null;
  draftNo?: number | null;
  customerName?: string | null;
};

export async function fetchOrdersList(): Promise<OrderDTO[]> {
  const res = await http.get<{ orders: OrderDTO[] }>(`/core/orders`, tenantHeaders());
  return res.data.orders || [];
}
