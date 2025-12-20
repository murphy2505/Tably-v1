import http from "../../services/http";

// tenantHeaders() removed — tenant is injected by http.ts interceptor
const BASE = ""; // baseURL handled by http client

export type ModifierOptionDTO = { id: string; name: string; priceDeltaCents: number };
export type ModifierGroupDTO = { id: string; name: string; minSelect: number; maxSelect: number; options: ModifierOptionDTO[] };

export async function apiListModifierGroups(signal?: AbortSignal): Promise<{ groups: ModifierGroupDTO[] }> {
  const resp = await http.get<{ groups: ModifierGroupDTO[] }>(`/core/modifiers/groups`, { signal } as any);
  return resp.data as any;
}

export async function apiGetProductModifierGroups(productId: string, signal?: AbortSignal): Promise<{ groups: ModifierGroupDTO[] }> {
  const resp = await http.get<{ groups: ModifierGroupDTO[] }>(`/core/products/${productId}/modifier-groups`, { signal } as any);
  return resp.data as any;
}
