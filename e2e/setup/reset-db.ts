// Run by playwright.config.ts before the E2E backend starts: wipes and re-seeds the E2E database,
// so every run starts from the seed and never touches the dev database.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { E2E_DATABASE_URL, E2E_DB_RESET_CONSENT, E2E_UPLOAD_DIR, assertE2eDatabase } from "./e2e-db";

assertE2eDatabase(E2E_DATABASE_URL);
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../backend");
const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: E2E_DB_RESET_CONSENT };
execSync("npx prisma migrate reset --force --skip-seed --skip-generate", { cwd: backend, env, stdio: "inherit" });
execSync("npx tsx prisma/seed.ts", { cwd: backend, env, stdio: "inherit" });
fs.rmSync(E2E_UPLOAD_DIR, { recursive: true, force: true });
