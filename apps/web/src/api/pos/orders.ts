import http from "../../services/http";

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export type OrderStatus = "OPEN" | "SENT" | "IN_PREP" | "READY" | "PAID" | "COMPLETED" | "CANCELLED";

export type OrderLineDTO = {
  id: string;
  title: string;
  qty: number;
  priceCents: number;
  vatRateBps?: number;
  vatSource?: "MENUITEM" | "PRODUCT" | "TENANT";
};

export type OrderDTO = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  sentAt?: string | null;
  inPrepAt?: string | null;
  readyAt?: string | null;
  paidAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  paymentMethod?: "PIN" | "CASH" | null;
  paymentRef?: string | null;
  cashReceivedCents?: number | null;
  receiptLabel?: string | null;
  draftLabel?: string | null;
  lines: OrderLineDTO[];
  subtotalExclVatCents: number;
  totalInclVatCents: number;
  vatBreakdown?: Record<string, { rateBps: number; grossCents: number; netCents: number; vatCents: number }>;
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

export async function apiAddOrderLine(orderId: string, productId: string, qty: number = 1, selectedOptionIds?: string[], menuItemId?: string): Promise<OrderDTO> {
  const payload: any = { productId, qty };
  if (selectedOptionIds && selectedOptionIds.length > 0) payload.selectedOptionIds = selectedOptionIds;
  if (menuItemId) payload.menuItemId = menuItemId;
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/lines`, payload, tenantHeaders());
  return res.data.order;
}

export async function apiPayOrder(
  orderId: string,
  payload: { method: "PIN"; paymentRef?: string } | { method: "CASH"; cashReceivedCents: number }
): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/pay`, payload as any, tenantHeaders());
  return res.data.order;
}
