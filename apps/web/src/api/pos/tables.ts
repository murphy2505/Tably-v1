import http from "../../services/http";

export type TableStatus = "FREE" | "BUSY" | "ACTIVE";
export type TableDTO = { id: string; name: string; capacity?: number | null; area?: string | null; sortIndex: number; status: TableStatus; openOrderId?: string | null };

export async function apiListTables(activeOrderId?: string): Promise<{ tables: TableDTO[] }> {
  const qs = activeOrderId ? `?activeOrderId=${encodeURIComponent(activeOrderId)}` : "";
  const res = await http.get<{ tables: TableDTO[] }>(`/pos/tables${qs}`);
  return res.data;
}

export async function apiCreateTable(payload: { name: string; capacity?: number; area?: string; sortIndex?: number }): Promise<{ table: any }> {
  const res = await http.post(`/pos/tables`, payload);
  return res.data;
}

export async function apiUpdateTable(id: string, patch: Partial<{ name: string; capacity: number | null; area: string | null; sortIndex: number }>): Promise<{ table: any }> {
  const res = await http.put(`/pos/tables/${id}`, patch);
  return res.data;
}

export async function apiOpenOrAssignOrderToTable(tableId: string): Promise<{ order: any }> {
  const res = await http.post(`/pos/tables/${tableId}/open`);
  return res.data;
}

export async function apiGetFloorplan(): Promise<{ floorplan: { id: string | null; name: string; layoutJson: any } }> {
  const res = await http.get(`/pos/floorplan`);
  return res.data;
}

export async function apiSaveFloorplan(payload: { name?: string; layoutJson: any }): Promise<{ floorplan: any }> {
  const res = await http.put(`/pos/floorplan`, payload);
  return res.data;
}

export type BookingType = "TABLE" | "GROUP" | "CUSTOMER" | "NONE";
export async function apiBookOrder(orderId: string, payload: { type?: BookingType; tableId?: string | null; groupId?: string | null; customerId?: string | null }) {
  const res = await http.post<{ order: any }>(`/pos/orders/${orderId}/book`, payload);
  return res.data.order;
}
