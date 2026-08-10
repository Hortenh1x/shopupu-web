import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure"
  },
  webServer: {
    // Serves the production build; run `npm run build` first with
    // NEXT_PUBLIC_API_BASE_URL pointing at the local backend, otherwise
    // .env.production bakes https://shopupu.net into the bundle.
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000
  }
});
