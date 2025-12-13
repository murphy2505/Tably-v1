import type { ActivePosMenuResponse } from "../types/pos";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4002";

export async function fetchActivePosMenu(signal?: AbortSignal): Promise<ActivePosMenuResponse> {
  const res = await fetch(`${apiUrl}/core/menu/active-pos-menu`, { signal });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}
