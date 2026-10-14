import { defineConfig } from "@playwright/test";
import { API, E2E_API_PORT, E2E_WEB_PORT, WEB } from "./e2e/env";
import { E2E_DATABASE_URL, E2E_UPLOAD_DIR } from "./e2e/setup/e2e-db";

// A second backend + frontend on their own ports, against showpro_e2e_test (reset and seeded on every run).
// The dev stack on :4000 / :8080 and its database are never touched.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: WEB, trace: "retain-on-failure" },
  workers: 1,
  webServer: [
    {
      command: "npx tsx ../e2e/setup/reset-db.ts && npx tsx src/server.ts",
      cwd: "backend",
      url: `http://localhost:${E2E_API_PORT}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: "test",
        PORT: String(E2E_API_PORT),
        DATABASE_URL: E2E_DATABASE_URL,
        JWT_SECRET: "e2e-secret-at-least-32-characters-long",
        CORS_ORIGIN: WEB,
        FRONTEND_URL: WEB,
        UPLOAD_DIR: E2E_UPLOAD_DIR,
        AUTH_RATE_LIMIT_MAX: "1000",
        API_RATE_LIMIT_MAX: "10000",
        UPLOAD_RATE_LIMIT_MAX: "1000",
        EXPOSE_RESET_TOKEN: "false",
        PASSWORD_RESET_WEBHOOK_URL: "",
      },
    },
    {
      command: `npx vite --port ${E2E_WEB_PORT} --strictPort`,
      url: WEB,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { VITE_API_BASE_URL: API, VITE_CACHE_DIR: "node_modules/.vite-e2e" },
    },
  ],
});
