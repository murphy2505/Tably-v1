import http from "../../services/http";

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

type OrderStatus = "OPEN" | "SENT" | "IN_PREP" | "READY" | "COMPLETED" | "CANCELLED";

export async function apiTransitionOrder(orderId: string, to: OrderStatus) {
  const res = await http.post<{ order: any }>(`/core/orders/${orderId}/transition`, { to }, tenantHeaders());
  return res.data.order;
}
