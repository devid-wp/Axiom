import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { axiomAiPlugin } from "./axiom-ai-plugin";

export default defineConfig({
  plugins: [react(), axiomAiPlugin()],
  root: "web",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./web/src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});