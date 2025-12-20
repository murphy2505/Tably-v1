import axios from "axios";

const BASE = "/api"; // proxy base
function tenantHeaders() {
  const tenantId = localStorage.getItem("tenantId") || "cafetaria-centrum";
  return { "x-tenant-id": tenantId };
}

export type ModifierOptionDTO = { id: string; name: string; priceDeltaCents: number };
export type ModifierGroupDTO = { id: string; name: string; minSelect: number; maxSelect: number; options: ModifierOptionDTO[] };

export async function apiListModifierGroups(signal?: AbortSignal): Promise<{ groups: ModifierGroupDTO[] }> {
  const resp = await axios.get(`${BASE}/core/modifiers/groups`, { headers: tenantHeaders(), signal });
  return resp.data;
}

export async function apiGetProductModifierGroups(productId: string, signal?: AbortSignal): Promise<{ groups: ModifierGroupDTO[] }> {
  const resp = await axios.get(`${BASE}/core/products/${productId}/modifier-groups`, { headers: tenantHeaders(), signal });
  return resp.data;
}
