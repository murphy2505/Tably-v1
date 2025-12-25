import http from "../../services/http";

// tenantHeaders() removed — tenant is injected by http.ts interceptor

export type OrderStatus = "OPEN" | "SENT" | "IN_PREP" | "READY" | "PAID" | "COMPLETED" | "CANCELLED" | "PARKED" | "VOIDED";
export type OrderKind = "QUICK" | "TRACKED";

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
  kind?: OrderKind;
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
  customer?: {
    id: string;
    name?: string | null;
    phoneE164?: string | null;
    loyalty?: { id: string; points: number } | null;
  } | null;
};

export async function apiTransitionOrder(orderId: string, to: OrderStatus): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/transition`, { to });
  return res.data.order;
}

export async function apiListOrders(params?: { status?: OrderStatus }): Promise<{ orders: OrderDTO[] }> {
  const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  const res = await http.get<{ orders: OrderDTO[] }>(`/core/orders${qs}`);
  return res.data;
}

export async function apiGetOrder(orderId: string): Promise<OrderDTO> {
  const res = await http.get<{ order: OrderDTO }>(`/core/orders/${orderId}`);
  return res.data.order;
}

export async function apiGetLastCompletedOrder(): Promise<OrderDTO> {
  const res = await http.get<{ order: OrderDTO }>(`/core/orders/last-completed`);
  return res.data.order;
}

export async function apiCreateOrder(payload?: { tableId?: string | null }): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders`, payload ?? {});
  return res.data.order;
}

export async function apiAddOrderLine(orderId: string, productId: string, qty: number = 1, selectedOptionIds?: string[], menuItemId?: string): Promise<OrderDTO> {
  const payload: any = { productId, qty };
  if (selectedOptionIds && selectedOptionIds.length > 0) payload.selectedOptionIds = selectedOptionIds;
  if (menuItemId) payload.menuItemId = menuItemId;
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/lines`, payload);
  return res.data.order;
}

export async function apiDeleteOrder(orderId: string): Promise<void> {
  await http.delete(`/core/orders/${orderId}`);
}

export async function apiVoidOrder(orderId: string, reason?: string): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/void`, { reason });
  return res.data.order;
}

export async function apiParkOrder(orderId: string, label?: string): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/park`, { label });
  return res.data.order;
}

export async function apiCancelOrder(orderId: string, reason: string): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/cancel`, { reason });
  return res.data.order;
}

export async function apiPayOrder(
  orderId: string,
  payload: { method: "PIN"; paymentRef?: string } | { method: "CASH"; cashReceivedCents: number }
): Promise<OrderDTO> {
  const res = await http.post<{ order: OrderDTO }>(`/core/orders/${orderId}/pay`, payload as any);
  return res.data.order;
}

// Link/unlink customer to order
export async function apiLinkCustomerToOrder(orderId: string, customerId: string): Promise<OrderDTO> {
  // Relative path → "/api/orders/:id/customer"
  const res = await http.post<{ order: OrderDTO }>(`orders/${orderId}/customer`, { customerId });
  return res.data.order;
}

export async function apiUnlinkCustomerFromOrder(orderId: string): Promise<OrderDTO> {
  // Relative path → "/api/orders/:id/customer"
  const res = await http.delete<{ order: OrderDTO }>(`orders/${orderId}/customer`);
  return res.data.order;
}

// Update order context (e.g., orderType)
export async function apiUpdateOrder(orderId: string, patch: Partial<{ orderType: string; tableId: string | null; customerId: string | null }>): Promise<OrderDTO> {
  const res = await http.put<{ order: OrderDTO }>(`/core/orders/${orderId}`, patch as any);
  return res.data.order;
}
