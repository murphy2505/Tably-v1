import type { ActivePosMenuResponse } from "../types/pos";

export async function fetchActivePosMenu(signal?: AbortSignal): Promise<ActivePosMenuResponse> {
  const res = await fetch(`/pos-api/core/menu/active-pos-menu`, { signal, credentials: "include" });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}
