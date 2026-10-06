import { execSync } from "node:child_process";
import { assertTestDatabase, TEST_DATABASE_URL, TEST_DB_RESET_CONSENT } from "./test-env";

export default function globalSetup() {
  assertTestDatabase(TEST_DATABASE_URL);
  const env = {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: TEST_DB_RESET_CONSENT,
  };
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", { env, stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "inherit" });
}
