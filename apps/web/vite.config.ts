import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
/**
 * Vite dev proxy configuration
 * - Uses API origin from env if provided (VITE_API_ORIGIN)
 * - Falls back to local backend on 127.0.0.1:4002
 *
 * For iPad on LAN, create `apps/web/.env.local` with for example:
 * VITE_API_ORIGIN=http://192.168.2.12:4002
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_ORIGIN || "http://127.0.0.1:4002";

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        // Direct /core/* to API target (used by backend routes mounted under /core)
        "/core": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          // Help long-lived SSE streams like /core/kds/stream
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              try {
                proxyReq.setHeader("Connection", "keep-alive");
                proxyReq.setHeader("Cache-Control", "no-cache");
              } catch {}
            });
          },
        },
        // Core API also exposed via /api/core/* in the frontend; strip /api prefix
        "/api/core": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              try {
                proxyReq.setHeader("Connection", "keep-alive");
                proxyReq.setHeader("Cache-Control", "no-cache");
              } catch {}
            });
          },
        },
        // Loyalty and other API routes mounted under /api/* should keep the /api prefix
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          // Preserve /api except for /api/core which is rewritten above
          rewrite: (path) =>
            path.startsWith("/api/core")
              ? path.replace(/^\/api\/core/, "/core")
              : path,
        },
      },
    },
  };
});
