import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://warehouse-api-m5p6hcoypa-uc.a.run.app",
        changeOrigin: true,
        secure: true,
      },
      "/admin": {
        target: "https://warehouse-api-m5p6hcoypa-uc.a.run.app",
        changeOrigin: true,
        secure: true,
      },
      "/infer": {
        target: "https://inference-demo-46825724091.us-central1.run.app",
        changeOrigin: true,
        secure: true,
      },
      "/models": {
        target: "https://inference-demo-46825724091.us-central1.run.app",
        changeOrigin: true,
        secure: true,
      },
      "/generate": {
        target: "https://inference-demo-46825724091.us-central1.run.app",
        changeOrigin: true,
        secure: true,
      },
      "/monitoring": {
        target: "https://inference-demo-46825724091.us-central1.run.app",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
