import http from "../../services/http";

export type MenuCard = {
  id: string;
  name: string;
  channel: "POS" | "WEB" | "BOTH";
  isActive: boolean;
  sortOrder: number;
  items?: MenuCardItem[];
};

export type MenuCardItem = {
  id: string;
  sortOrder: number;
  product?: { id: string; name: string; basePriceCents: number; category?: { id: string; name: string } } | null;
};

function tenantHeaders() {
  const tenantId = localStorage.getItem("tenantId") || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export async function listMenus(): Promise<(MenuCard & { itemsCount: number })[]> {
  const res = await http.get<any>("/core/menu-cards", tenantHeaders());
  const cards: MenuCard[] = res.data?.data ?? [];
  return (cards || []).map((c) => ({ ...c, itemsCount: (c.items || []).length }));
}

export async function getMenu(menuId: string): Promise<MenuCard> {
  const res = await http.get<any>(`/core/menu-cards/${menuId}`, tenantHeaders());
  return res.data?.data;
}

export async function addMenuItem(menuId: string, productId: string, sortOrder: number): Promise<MenuCardItem> {
  const res = await http.post<any>(`/core/menu-cards/${menuId}/items`, { productId, sortOrder }, tenantHeaders());
  return res.data?.data;
}
