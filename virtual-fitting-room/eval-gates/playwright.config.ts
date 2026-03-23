import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "on",
    trace: "on-first-retry",
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro — mobile-first
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // Production server — NOT dev mode
  webServer: {
    command: "NEXT_PUBLIC_SKIP_AUTH=true npm run build && NEXT_PUBLIC_SKIP_AUTH=true npm start",
    cwd: "..",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
  outputDir: "../eval/test-results",
  workers: 1,
});
