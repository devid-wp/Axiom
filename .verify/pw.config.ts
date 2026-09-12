import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "/home/kr1m12/Desktop/Axiom/.verify",
  testMatch: "axiom-hier.spec.ts",
  timeout: 120000,
  retries: 0,
  use: {
    browserName: "firefox",
    viewport: { width: 1500, height: 950 },
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:5173/",
    timeout: 60000,
    reuseExistingServer: false,
    env: { VITE_AI_API_KEY: "" },
  },
});
