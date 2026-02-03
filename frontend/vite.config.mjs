import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3000",
      "/workspaces": "http://localhost:3000",
      "/screenshots": "http://localhost:3000",
      "/icp-avatars": "http://localhost:3000",
      "/icp-heroes": "http://localhost:3000",
      "/creatives": "http://localhost:3000",
      "/admin": "http://localhost:3000",
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
});
