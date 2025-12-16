import http from "../../services/http";

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export type OrderStatus = "OPEN" | "SENT" | "IN_PREP" | "READY" | "COMPLETED" | "CANCELLED";

export type OrderLineDTO = {
  id: string;
  title: string;
  qty: number;
  priceCents: number;
};

export type OrderDTO = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  sentAt?: string | null;
  inPrepAt?: string | null;
  readyAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  lines: OrderLineDTO[];
};

export async function apiTransitionOrder(orderId: string, to: OrderStatus): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/transition`, { to }, tenantHeaders());
  return res.data.order;
}

export async function apiListOrders(params?: { status?: OrderStatus }): Promise<{ orders: OrderDTO[] }> {
  const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  const res = await http.get<{ orders: OrderDTO[] }>(`/core/orders${qs}`, tenantHeaders());
  return res.data;
}

export async function apiGetOrder(orderId: string): Promise<OrderDTO> {
  const res = await http.get<{ order: OrderDTO }>(`/core/orders/${orderId}`, tenantHeaders());
  return res.data.order;
}

export async function apiGetLastCompletedOrder(): Promise<OrderDTO> {
  const res = await http.get<{ order: OrderDTO }>(`/core/orders/last-completed`, tenantHeaders());
  return res.data.order;
}

export async function apiCreateOrder(payload?: { tableId?: string | null }): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders`, payload ?? {}, tenantHeaders());
  return res.data.order;
}

export async function apiAddOrderLine(orderId: string, productId: string, qty: number = 1): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/lines`, { productId, qty }, tenantHeaders());
  return res.data.order;
}
