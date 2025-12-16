import type { ActivePosMenuResponse, PosMenuDTO, PosMenuItemDTO } from "../types/pos";
import http from "../services/http";

function tenantHeaders() {
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID || "cafetaria-centrum";
  return { headers: { "x-tenant-id": tenantId } };
}

export async function fetchActivePosMenu(_signal?: AbortSignal): Promise<ActivePosMenuResponse> {
  // Use new menu-cards active resolver and map to legacy PosMenuDTO shape
  const res = await http.get<{ menuCards: Array<{ id: string; name: string; sortOrder: number; items: any[] }> }>(
    "/core/menu-cards/active",
    { ...tenantHeaders(), params: { channel: "POS" } }
  );
  const cards = res.data.menuCards || [];
  if (!cards.length) return { data: null };
  const items: PosMenuItemDTO[] = cards
    .flatMap((c) => c.items.map((it) => ({ ...it, _cardSort: c.sortOrder })))
    .sort((a: any, b: any) => (a._cardSort - b._cardSort) || (a.sortOrder - b.sortOrder))
    .map((it: any) => ({
      id: it.id,
      sortOrder: it.sortOrder,
      priceCents: it.priceCents,
      product: it.product,
      variant: it.variant,
      course: null,
    }));
  const dto: PosMenuDTO = {
    id: cards[0].id,
    name: cards[0].name,
    slug: "active",
    channel: "POS",
    layoutType: "GRID",
    columns: 4,
    items,
  };
  return { data: dto };
}
