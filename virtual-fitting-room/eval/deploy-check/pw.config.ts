import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "NEXT_PUBLIC_SKIP_AUTH=true npm run build && NEXT_PUBLIC_SKIP_AUTH=true npm start",
    cwd: "../..",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
  workers: 1,
});
