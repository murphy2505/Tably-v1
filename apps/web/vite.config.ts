import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,

    proxy: {
      // Core API lives at /core/* on the backend (not under /api).
      // We expose it to the frontend as /api/core/* and strip the /api prefix here.
      "/api/core": {
        target: "http://127.0.0.1:4002",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api": {
        target: "http://127.0.0.1:4002",
        changeOrigin: true,
        secure: false,
        // Preserve the /api prefix so backend routes like /api/loyalty/* resolve
        // correctly on the API server (mounted under /api/*).
        // No rewrite necessary.
      },
    },
  },
});
