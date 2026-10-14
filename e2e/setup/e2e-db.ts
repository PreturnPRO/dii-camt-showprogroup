import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** the dev DATABASE_URL from backend/.env (or the environment), with the database renamed to showpro_e2e_test */
function fromDevDatabaseUrl(): string {
  let url = process.env.DATABASE_URL ?? "";
  const envFile = path.resolve(here, "../../backend/.env");
  if (!url && fs.existsSync(envFile)) {
    // like dotenv: the last DATABASE_URL line wins; "export " and a trailing " # comment" are allowed
    const match = [...fs.readFileSync(envFile, "utf8").matchAll(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/gm)].pop();
    url = match ? match[1].replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "") : "";
  }
  return url.replace(/\/([^/?]+)(\?|$)/, "/showpro_e2e_test$2");
}

/** uploads made during E2E; emptied at the start of every run */
export const E2E_UPLOAD_DIR = path.join(os.tmpdir(), "showpro-e2e-uploads");

export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? fromDevDatabaseUrl();

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** refuses anything but a local database whose name ends with _e2e_test */
export function assertE2eDatabase(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Refusing to run E2E: no database URL (set DATABASE_URL in backend/.env or E2E_DATABASE_URL)");
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.endsWith("_e2e_test")) {
    throw new Error(`Refusing to run E2E against "${dbName}": database name must end with _e2e_test`);
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`Refusing to run E2E against host "${parsed.hostname}": the E2E database must be on localhost`);
  }
}

// Por's consent (2026-10-14) for Prisma's AI-agent reset guard, scoped to showpro_e2e_test only
export const E2E_DB_RESET_CONSENT = "ยินยอมให้สร้างและล้าง showpro_e2e_test ได้ทุกครั้งที่รัน E2E";
