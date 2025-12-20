import axios from "axios";

const http = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

function getTenantId(): string | null {
  let tenantId: string | null = null;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      tenantId = window.localStorage.getItem("tenantId")
        || window.localStorage.getItem("DEFAULT_TENANT")
        || window.localStorage.getItem("x-tenant-id")
        || null;
    }
  } catch {}
  const fromEnv = (import.meta as any).env?.VITE_DEFAULT_TENANT_ID || null;
  tenantId = tenantId || fromEnv;
  if ((import.meta as any).env?.DEV && !tenantId) tenantId = "cafetaria-centrum";
  return tenantId;
}

http.interceptors.request.use((config) => {
  const tenantId = getTenantId();
  if (!tenantId && (import.meta as any).env?.DEV) {
    console.warn("[tenant] missing x-tenant-id for", config.url);
  }
  config.headers = config.headers || {};
  if (tenantId) (config.headers as any)["x-tenant-id"] = tenantId;
  return config;
});

export default http;
