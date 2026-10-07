import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL, TEST_JWT_SECRET } from "./tests/setup/test-env";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: TEST_JWT_SECRET,
      CORS_ORIGIN: "http://localhost:5173",
      AUTH_RATE_LIMIT_MAX: "1000",
      EXPOSE_RESET_TOKEN: "false",
      // uploads made by tests go to a throw-away folder, never into the app's storage/uploads
      UPLOAD_DIR: path.join(os.tmpdir(), "showpro-test-uploads"),
    },
    fileParallelism: false,
  },
});
