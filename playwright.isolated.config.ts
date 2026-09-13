import { defineConfig, devices } from "@playwright/test";

if (process.env.E2E_BASE_URL !== "http://127.0.0.1:3120" || process.env.E2E_API_BASE_URL !== "http://127.0.0.1:18080") {
  throw new Error("Use the isolated backend ops/check-full-stack.sh harness; existing servers are never reused.");
}
if (!process.env.E2E_FIXTURE_FILE || !process.env.E2E_PASSWORD || !process.env.E2E_ARTIFACT_DIR) {
  throw new Error("The isolated fixture, generated password and artifact directory are required.");
}

export default defineConfig({
  testDir: "e2e",
  testMatch: process.env.E2E_REQUIRE_DE === "1"
    ? ["remediation.acceptance.ts", "locale.acceptance.ts"]
    : ["remediation.acceptance.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: true,
  outputDir: `${process.env.E2E_ARTIFACT_DIR}/results`,
  reporter: [["list"], ["json", { outputFile: `${process.env.E2E_ARTIFACT_DIR}/results.json` }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3120",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: { args: ["--renderer-process-limit=2", "--disable-dev-shm-usage"] }
  }
  // Deliberately no webServer/reuseExistingServer. The guarded harness owns both processes.
});
