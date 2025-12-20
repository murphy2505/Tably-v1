import http from "../services/http";
import type { OrderDTO } from "./pos/orders";

// tenantHeaders() removed — tenant is injected by http.ts interceptor

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
  kind?: "QUICK" | "TRACKED";
};

export async function fetchOrdersList(): Promise<OrderDTO[]> {
  const res = await http.get<{ orders: OrderDTO[] }>(`/core/orders`);
  return res.data.orders || [];
}
