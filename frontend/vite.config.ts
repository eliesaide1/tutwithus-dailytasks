import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// In development the API runs separately (backend/, port 4000); Vite proxies /api so the
// session cookie stays same-origin. In production set VITE_API_URL if the API lives on
// another origin, or let the backend serve this build.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { "/api": { target: process.env.API_PROXY_TARGET ?? "http://localhost:4000", changeOrigin: false } },
  },
});
