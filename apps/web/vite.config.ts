import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "192.168.2.12", // 👈 LAN IP
    port: 5173,
    strictPort: true,

    proxy: {
      "/pos-api": {
        target: "http://192.168.2.12:4002", // backend
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/pos-api/, ""),
      },
    },
  },
});
