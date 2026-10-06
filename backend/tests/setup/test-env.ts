import "dotenv/config";

const fromDev = (process.env.DATABASE_URL ?? "").replace(/\/([^/?]+)(\?|$)/, "/showpro_main_test$2");

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? fromDev;
export const TEST_JWT_SECRET = "test-secret-at-least-16-chars";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function assertTestDatabase(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Refusing to run tests: TEST_DATABASE_URL is not a valid URL");
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to run tests against "${dbName}": database name must end with _test`);
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`Refusing to run tests against host "${parsed.hostname}": test database must be on localhost`);
  }
}

// Por's consent (2026-10-06) for Prisma's AI-agent reset guard, scoped to showpro_main_test only
export const TEST_DB_RESET_CONSENT = "ยินยอมให้สร้างและล้าง showpro_main_test ได้ทุกครั้งที่รันเทสต์";
