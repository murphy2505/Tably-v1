import { ZoneSettings, FloorObject } from "./types";

function getTenantId(): string {
  try {
    const ls = window.localStorage;
    const t = ls.getItem("tenantId") || ls.getItem("DEFAULT_TENANT") || ls.getItem("x-tenant-id") || "default";
    return t;
  } catch {
    return "default";
  }
}

function key(zoneId: string, suffix: string) {
  const tenant = getTenantId();
  return `floorplan:${tenant}:${zoneId}:${suffix}`;
}

export function loadZoneSettings(zoneId: string): ZoneSettings {
  try {
    const raw = window.localStorage.getItem(key(zoneId, "settings"));
    return raw ? JSON.parse(raw) : { backgroundTint: "#f9fafb", gridEnabled: true, snapEnabled: true, showAmountsOnTables: true, showNamesOnTables: false, defaultTableShape: "RECT", baseWidth: 1024, baseHeight: 768 };
  } catch {
    return { backgroundTint: "#f9fafb", gridEnabled: true, snapEnabled: true, showAmountsOnTables: true, showNamesOnTables: false, defaultTableShape: "RECT", baseWidth: 1024, baseHeight: 768 };
  }
}

export function saveZoneSettings(zoneId: string, settings: ZoneSettings) {
  window.localStorage.setItem(key(zoneId, "settings"), JSON.stringify(settings));
}

export function loadZoneObjects(zoneId: string): FloorObject[] {
  try {
    const raw = window.localStorage.getItem(key(zoneId, "objects"));
    if (!raw) return [];
    const list = JSON.parse(raw) as FloorObject[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveZoneObjects(zoneId: string, objects: FloorObject[]) {
  window.localStorage.setItem(key(zoneId, "objects"), JSON.stringify(objects));
}
