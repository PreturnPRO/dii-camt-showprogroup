# Audit S-a: ปิดสายโซ่ยึดบัญชี (S1–S3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปิดทางที่คนนอกหรือผู้ใช้ทั่วไปยึดบัญชี admin / บัญชีบริษัท / บัญชีใดก็ได้ ตามผลตรวจ S1, S2, S3 และ rate limit ของ auth

**Architecture:** แก้ที่ backend Express เป็นหลัก (route guard + controller rule) แล้วปรับหน้าเว็บ React ให้ตรงกับ API ใหม่ · ตั้ง harness เทสต์ backend (vitest + supertest + DB `showpro_main_test` ที่ล้างทุกครั้ง) เพราะ branch นี้ยังไม่มีเทสต์ backend เลย · ปิด E2E ด้วย Playwright ตรวจว่าหน้าเว็บใช้ API ใหม่ได้จริง

**Tech Stack:** Express 4, Prisma 6, Zod, passport-jwt, Vitest 3, supertest 7, express-rate-limit 7, React 18 + Vite, Playwright

**Spec:** ผลตรวจ `~/Documents/dii-audit-2026-10/SUMMARY.html` (กลุ่ม S1, S2, S3, M3-rate-limit) + รายละเอียด `~/Documents/dii-audit-2026-10/1-backend-auth-security.md` · การตัดสินของ Por 6/10/69: สมัครเองได้ **นักศึกษาเท่านั้น** · บริษัท login ด้วย **อีเมล + รหัสผ่าน** (ตัด login ด้วยเบอร์) · ยินยอมให้สร้างและล้าง `showpro_main_test` ทุกครั้งที่รันเทสต์ · ไม่บอกทีม

## Global Constraints

- Repo: worktree `/Users/pordiewtrakul/WORK /dii-main-audit` (path มีเว้นวรรค ต้อง quote) · branch `fix/audit-2026-10` แตกจาก `64fcafb`
- **ห้าม commit / push** ระหว่างรัน — Por อนุมัติ commit เองตอนจบ · executor ตัด diff รีวิวจาก tree snapshot (temp index + `git write-tree`)
- ห้ามแตะ DB `showpro` (dev ของ phase1) และ `showpro_test` (ของ phase1) · DB dev ของ branch นี้คือ `showpro_main` · เทสต์ใช้ `showpro_main_test` เท่านั้น (guard ปฏิเสธชื่อที่ไม่ลงท้าย `_test`)
- ห้ามรัน `prisma format` · migration ใหม่สร้างด้วย `npx prisma migrate dev --create-only --name <name>` กับ `showpro_main` แล้วตรวจ SQL ก่อน apply
- ข้อความ UI ภาษาไทย: ห้าม letter-spacing กับข้อความไทย · line-height ≥ 1.35 (หัวข้อ) / 1.6 (เนื้อหา)
- ทุกตัวเลขบนจอต้องมีหน่วยและขอบเขต (กฎตัวเลขของ Por)
- รหัสผ่านชั่วคราวที่ระบบสร้าง: สุ่มด้วย `crypto.randomBytes(9).toString("base64url")` (12 ตัวอักษร) — ห้ามใช้ `Password123!` เป็นค่า default อีก (seed ยังใช้ได้)
- token เดิมที่ไม่มี `typ:"access"` จะใช้ไม่ได้หลังแก้ ผู้ใช้ต้อง login ใหม่ครั้งเดียว (ยอมรับได้)

## Review Focus

1. STAFF แก้ผู้ใช้ที่เป็น STAFF/ADMIN ผ่านช่องทางอื่นที่ไม่ใช่ `role` เช่น `isActive:false`, `password`, `DELETE` → ต้อง 403 ทุกช่องทาง (เทสต์ใน Task 4)
2. ADMIN ปิดบัญชีตัวเอง / ลดสิทธิ์ตัวเองจนไม่เหลือ admin → กันไว้ (ปิดตัวเองมีอยู่แล้ว · ลด role ตัวเองต้อง 400) (เทสต์ใน Task 4)
3. อีเมลตัวพิมพ์ใหญ่ตอน login หลังบริษัทถูกสร้างด้วยอีเมลตัวเล็ก → ต้อง login ได้ (เทสต์ใน Task 5)
4. ผู้ใช้ที่ `mustChangePassword` แล้วกดปิด dialog / รีเฟรช → dialog ต้องกลับมาจนกว่าจะเปลี่ยนรหัส (E2E ใน Task 6)
5. import บริษัท 2 แถวในไฟล์เดียวกัน → ได้รหัสชั่วคราวไม่ซ้ำกัน และแต่ละบัญชี `mustChangePassword=true` (เทสต์ใน Task 4)

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `backend/vitest.config.ts` (สร้าง) | config เทสต์ + env ของเทสต์ |
| `backend/tests/setup/test-env.ts` (สร้าง) | URL DB เทสต์ + guard `_test` + ข้อความยินยอม |
| `backend/tests/setup/global-setup.ts` (สร้าง) | reset + seed DB เทสต์ครั้งเดียวต่อรอบ |
| `backend/tests/helpers/auth.ts` (สร้าง) | `loginAs(email)`, `uniqueEmail()` |
| `backend/src/app.ts` (แก้) | แยกเป็น `createApp()` + rate limit `/api/auth` |
| `backend/src/utils/auth.ts` (แก้) | `signToken` ใส่ `typ:"access"` · `generateTemporaryPassword()` |
| `backend/src/lib/passport.ts`, `backend/src/lib/realtime.ts` (แก้) | รับเฉพาะ token `typ:"access"` |
| `backend/src/config/env.ts` (แก้) | `EXPOSE_RESET_TOKEN`, `AUTH_RATE_LIMIT_MAX` |
| `backend/src/controllers/auth.controller.ts` (แก้) | สมัครนักศึกษาเท่านั้น · ตัด companyLogin · forgot-password ไม่คืน token · profile ห้ามตั้ง permissions/isSuperAdmin · ล้าง `mustChangePassword` |
| `backend/src/services/user-policy.ts` (สร้าง) | กติกาว่าใครจัดการ role ไหนได้ (pure function) |
| `backend/src/controllers/system.controller.ts` (แก้) | ใช้ user-policy ใน create/update/delete · import ใช้รหัสสุ่ม |
| `backend/prisma/schema.prisma` + migration (แก้/สร้าง) | `User.mustChangePassword Boolean @default(false)` |
| `src/pages/RegisterPage.tsx`, `src/pages/LoginPage.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/api.ts`, `src/pages/Users.tsx` (แก้) | หน้าเว็บตาม API ใหม่ |
| `src/components/common/ForcePasswordChangeDialog.tsx` (สร้าง) | บังคับเปลี่ยนรหัสครั้งแรก |
| `src/components/common/CompanyOnboardingDialog.tsx`, `src/components/layout/DashboardLayout.tsx` (แก้) | ลำดับ dialog: เปลี่ยนรหัสก่อน แล้วค่อย onboarding |
| `playwright.config.ts`, `e2e/auth-hardening.spec.ts` (สร้าง) | ตรวจว่าใช้งานจริงผ่านเบราว์เซอร์ |

---

### Task 1: Harness เทสต์ backend + `createApp()`

**Files:**
- Create: `backend/vitest.config.ts`, `backend/tests/setup/test-env.ts`, `backend/tests/setup/global-setup.ts`, `backend/tests/helpers/auth.ts`, `backend/tests/smoke.test.ts`
- Modify: `backend/src/app.ts` (ทั้งไฟล์), `backend/package.json` (scripts + devDependencies), `backend/src/config/env.ts`

**Interfaces:**
- Produces: `createApp(options?: { authRateLimitMax?: number }): Express` และ `app` (= `createApp()`) จาก `src/app.ts` · `loginAs(email: string, password?: string): Promise<string>` (คืน token) และ `uniqueEmail(prefix: string): string` จาก `tests/helpers/auth.ts` · env ใหม่ `AUTH_RATE_LIMIT_MAX` (number, default 20) และ `EXPOSE_RESET_TOKEN` (boolean, default false)

- [ ] **Step 1: เพิ่ม dependency และ script** (ของมีใน node_modules แล้ว คำสั่งนี้แค่บันทึกลง package.json/lock)

```bash
cd "/Users/pordiewtrakul/WORK /dii-main-audit/backend"
npm install --save express-rate-limit@^7.5.1
npm install --save-dev vitest@^3.2.7 supertest@^7.3.1 @types/supertest@^6.0.3
npm pkg set scripts.test="vitest run"
```

- [ ] **Step 2: เขียน env ของเทสต์ + guard**

`backend/tests/setup/test-env.ts`:
```ts
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
```

`backend/tests/setup/global-setup.ts`:
```ts
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
```

`backend/vitest.config.ts`:
```ts
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
    },
    fileParallelism: false,
  },
});
```

- [ ] **Step 3: เขียน helper + smoke test ที่ fail**

`backend/tests/helpers/auth.ts`:
```ts
import request from "supertest";
import { app } from "../../src/app";

export const SEED_PASSWORD = "Password123!";

export async function loginAs(email: string, password = SEED_PASSWORD): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token as string;
}

let counter = 0;
export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${process.pid}-${Date.now()}-${counter}@example.com`;
}
```

`backend/tests/smoke.test.ts`:
```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, createApp } from "../src/app";
import { loginAs } from "./helpers/auth";

describe("smoke", () => {
  it("GET /health is healthy", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });

  it("seeded student can log in and the response never contains passwordHash", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@student.showpro.local", password: "Password123!" });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("createApp returns a fresh app each call", () => {
    expect(createApp()).not.toBe(createApp());
  });

  it("loginAs returns a usable token", async () => {
    const token = await loginAs("admin@showpro.local");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 4: รันให้เห็นว่า fail**

Run: `cd "/Users/pordiewtrakul/WORK /dii-main-audit/backend" && npx vitest run tests/smoke.test.ts`
Expected: FAIL — `createApp` is not exported (ส่วน health/login อาจผ่าน)

- [ ] **Step 5: แยก `createApp()` และเพิ่ม env**

`backend/src/config/env.ts` เพิ่มใน `envSchema`:
```ts
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  EXPOSE_RESET_TOKEN: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
```
และหลัง `export const env = envSchema.parse(process.env);` เพิ่ม:
```ts
if (env.NODE_ENV === "production" && env.EXPOSE_RESET_TOKEN) {
  throw new Error("EXPOSE_RESET_TOKEN must never be true in production");
}
```

`backend/src/app.ts` — ย้ายโค้ดตั้งแต่ `const configuredCorsOrigins` ถึง `app.use(errorHandler)` เข้าไปในฟังก์ชัน (ไม่เปลี่ยนลำดับ middleware) แล้วแทรก limiter ก่อน `app.use("/api", router)`:
```ts
import rateLimit from "express-rate-limit";
// ...imports เดิม...

export function createApp(options: { authRateLimitMax?: number } = {}) {
  const app = express();
  // ...โค้ด CORS/helmet/morgan/json/urlencoded/passport/health/docs เดิมทั้งหมด...

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: options.authRateLimitMax ?? env.AUTH_RATE_LIMIT_MAX,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { success: false, message: "Too many attempts. Please wait 15 minutes and try again." },
    }),
  );

  app.use("/api", router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
```
`server.ts` ใช้ `import { app } from "./app"` เหมือนเดิม ไม่ต้องแก้

- [ ] **Step 6: เพิ่มเทสต์ rate limit (fail ก่อนเพราะยังไม่มี limiter จริงก็ต้องเห็นแดงเมื่อ comment limiter ออก)**

`backend/tests/auth-rate-limit.test.ts`:
```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("rate limit on /api/auth", () => {
  it("returns 429 after the configured number of attempts from one IP", async () => {
    const app = createApp({ authRateLimitMax: 3 });
    const attempt = () => request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "wrongpass1" });
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
  });

  it("counts forgot-password in the same budget", async () => {
    const app = createApp({ authRateLimitMax: 2 });
    await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
    await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "wrongpass1" });
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "wrongpass1" });
    expect(res.status).toBe(429);
  });

  it("does not limit non-auth routes", async () => {
    const app = createApp({ authRateLimitMax: 1 });
    await request(app).get("/health");
    expect((await request(app).get("/health")).status).toBe(200);
  });
});
```

- [ ] **Step 7: รันทั้งชุด**

Run: `cd "/Users/pordiewtrakul/WORK /dii-main-audit/backend" && npx vitest run`
Expected: PASS ทั้ง `smoke.test.ts` (4) และ `auth-rate-limit.test.ts` (3) · ตรวจแดงจริง: comment บล็อก `app.use("/api/auth", rateLimit(...))` ชั่วคราว → เทสต์ rate limit 2 ข้อแรกต้อง FAIL → คืนโค้ด

- [ ] **Step 8: typecheck**

Run: `cd "/Users/pordiewtrakul/WORK /dii-main-audit/backend" && npx tsc --noEmit`
Expected: exit 0

---

### Task 2: token ประเภท access + forgot-password ไม่คืน token (S3)

**Files:**
- Modify: `backend/src/utils/auth.ts`, `backend/src/lib/passport.ts`, `backend/src/lib/realtime.ts:57`, `backend/src/controllers/auth.controller.ts` (forgotPassword ~L368-410, resetPassword ~L412-460)
- Test: `backend/tests/token-type.test.ts`, `backend/tests/forgot-password.test.ts`

**Interfaces:**
- Consumes: `app`, `loginAs` (Task 1), `env.EXPOSE_RESET_TOKEN` (Task 1)
- Produces: `signToken` คืน JWT ที่มี `typ: "access"` · `isAccessPayload(payload: unknown): payload is { sub: string; typ: "access" }` export จาก `src/utils/auth.ts`

- [ ] **Step 1: เขียนเทสต์ที่ fail**

`backend/tests/token-type.test.ts`:
```ts
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const SECRET = "test-secret-at-least-16-chars";

describe("access tokens", () => {
  it("accepts a normal login token", async () => {
    const token = await loginAs("alice@student.showpro.local");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("rejects a password-reset token as a login token", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "alice@student.showpro.local" } });
    const resetLike = jwt.sign({ sub: user.id, email: user.email, purpose: "password-reset", marker: "x" }, SECRET, { expiresIn: "30m" });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${resetLike}`);
    expect(res.status).toBe(401);
  });

  it("rejects a correctly signed token that has no access type", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "alice@student.showpro.local" } });
    const legacy = jwt.sign({ sub: user.id, role: user.role, email: user.email }, SECRET, { expiresIn: "1h" });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${legacy}`);
    expect(res.status).toBe(401);
  });

  it("optionalAuth ignores a non-access token instead of treating it as a user", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "alice@student.showpro.local" } });
    const resetLike = jwt.sign({ sub: user.id, purpose: "password-reset" }, SECRET, { expiresIn: "30m" });
    // /files/public/:id uses optionalAuth; a non-existent id must give 404, not 500 and not a user context
    const res = await request(app).get("/api/files/public/does-not-exist").set("Authorization", `Bearer ${resetLike}`);
    expect([401, 404]).toContain(res.status);
  });
});
```

`backend/tests/forgot-password.test.ts`:
```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("POST /api/auth/forgot-password", () => {
  it("never returns the reset token or URL when EXPOSE_RESET_TOKEN is false", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "admin@showpro.local" });
    expect(res.status).toBe(200);
    expect(res.body.resetToken).toBeUndefined();
    expect(res.body.resetUrl).toBeUndefined();
  });

  it("answers the same way for an unknown email", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("If this email exists, a password reset link has been prepared.");
  });
});
```

- [ ] **Step 2: รันให้เห็น fail**

Run: `npx vitest run tests/token-type.test.ts tests/forgot-password.test.ts`
Expected: FAIL — reset-like และ legacy token ได้ 200 · forgot-password คืน `resetToken` (NODE_ENV=test ไม่ใช่ production)

- [ ] **Step 3: แก้โค้ด**

`backend/src/utils/auth.ts`:
```ts
export const signToken = (payload: { sub: string; role: Role; email: string }) =>
  jwt.sign({ ...payload, typ: "access" }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

export const isAccessPayload = (payload: unknown): payload is { sub: string; typ: "access" } =>
  typeof payload === "object" &&
  payload !== null &&
  (payload as { typ?: unknown }).typ === "access" &&
  typeof (payload as { sub?: unknown }).sub === "string";

export const generateTemporaryPassword = () => randomBytes(9).toString("base64url");
```
(เพิ่ม `import { randomBytes } from "node:crypto";` ด้านบน — `generateTemporaryPassword` ใช้ใน Task 4)

`backend/src/lib/passport.ts` — ใน verify callback ของ `JwtStrategy` บรรทัดแรก:
```ts
      if (!isAccessPayload(payload)) {
        return done(null, false);
      }
```
และใน `optionalAuth` หลัง `jwt.verify(...)`:
```ts
    if (!isAccessPayload(payload)) {
      return next();
    }
```
(import `isAccessPayload` จาก `../utils/auth`)

`backend/src/lib/realtime.ts:57` — หลัง `const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;` เพิ่ม `if (!isAccessPayload(payload)) { return next(new Error("Unauthorized")); }` ตาม pattern error ที่ไฟล์นั้นใช้อยู่ (อ่านบล็อก catch เดิมก่อนแล้วใช้รูปแบบเดียวกัน)

`backend/src/controllers/auth.controller.ts` forgotPassword — เปลี่ยน
```ts
    if (env.NODE_ENV !== "production") {
```
เป็น
```ts
    if (env.EXPOSE_RESET_TOKEN) {
```
resetPassword — หลังเช็ค `tokenPayload.success` เพิ่มเงื่อนไขว่าต้องเป็น token รีเซ็ต:
```ts
  if (!tokenPayload.success || (payload as { purpose?: unknown }).purpose !== "password-reset") {
    throw new AppError(400, "Password reset link is invalid or has expired");
  }
```
(ลบเงื่อนไข `if (!tokenPayload.success)` เดิมที่ซ้ำ)

- [ ] **Step 4: เพิ่มเทสต์ว่า reset token ยังรีเซ็ตได้ และ access token รีเซ็ตไม่ได้** (ต่อท้าย `forgot-password.test.ts`)

```ts
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/utils/auth";
import { loginAs, uniqueEmail } from "./helpers/auth";

describe("POST /api/auth/reset-password", () => {
  const SECRET = "test-secret-at-least-16-chars";

  async function makeUser() {
    return prisma.user.create({
      data: { email: uniqueEmail("reset"), passwordHash: await hashPassword("OldPassword1!"), name: "R", nameThai: "อาร์", role: "STUDENT" },
      omit: { passwordHash: false },
    });
  }

  it("still accepts a genuine reset token", async () => {
    const user = await makeUser();
    const marker = createHash("sha256").update(user.passwordHash).digest("hex");
    const token = jwt.sign({ sub: user.id, email: user.email, purpose: "password-reset", marker }, SECRET, { expiresIn: "30m" });
    const res = await request(app).post("/api/auth/reset-password").send({ token, password: "NewPassword1!" });
    expect(res.status).toBe(200);
  });

  it("rejects an access token used as a reset token", async () => {
    const token = await loginAs("alice@student.showpro.local");
    const res = await request(app).post("/api/auth/reset-password").send({ token, password: "NewPassword1!" });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 5: รันทั้งชุด**

Run: `npx vitest run`
Expected: PASS ทั้งหมด (smoke 4, rate-limit 3, token-type 4, forgot/reset 4)

- [ ] **Step 6: typecheck** — `npx tsc --noEmit` → exit 0

---

### Task 3: สมัครเองได้เฉพาะนักศึกษา (S1 ส่วนที่ 1)

**Files:**
- Modify: `backend/src/schemas/auth.schema.ts` (`registerSchema`), `backend/src/controllers/auth.controller.ts` (`register` L97-271)
- Test: `backend/tests/register.test.ts`

**Interfaces:**
- Consumes: `app`, `uniqueEmail` (Task 1)
- Produces: `POST /api/auth/register` สร้างได้แค่ STUDENT · `role` ใน body ถ้ามีต้องเป็น `"STUDENT"` ไม่งั้น 400 · `profile.advisorId` ถูกเพิกเฉย (S-b จะเก็บกวาดส่วนที่เหลือ)

- [ ] **Step 1: เขียนเทสต์ที่ fail**

`backend/tests/register.test.ts`:
```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { uniqueEmail } from "./helpers/auth";

const studentBody = (email: string, studentId: string) => ({
  email,
  password: "Password123!",
  name: "New Student",
  nameThai: "นักศึกษาใหม่",
  role: "STUDENT",
  profile: { studentId, major: "DII", program: "bachelor", year: 1, semester: 1, academicYear: "2569" },
});

describe("POST /api/auth/register", () => {
  it("creates a STUDENT", async () => {
    const email = uniqueEmail("stu");
    const res = await request(app).post("/api/auth/register").send(studentBody(email, `S${Date.now()}`));
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("STUDENT");
  });

  it.each(["STAFF", "LECTURER", "COMPANY", "ADMIN"])("rejects self-registration as %s", async (role) => {
    const email = uniqueEmail(role.toLowerCase());
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...studentBody(email, `X${Date.now()}`), role, profile: { staffId: "X1", lecturerId: "L1", companyId: "C1", department: "x", position: "x", companyName: "x" } });
    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("does not let a new student pick their own advisor", async () => {
    const lecturer = await prisma.lecturerProfile.findFirstOrThrow();
    const email = uniqueEmail("adv");
    const body = studentBody(email, `A${Date.now()}`);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...body, profile: { ...body.profile, advisorId: lecturer.id } });
    expect(res.status).toBe(201);
    const created = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email } } });
    expect(created.advisorId).toBeNull();
  });
});
```

- [ ] **Step 2: รันให้เห็น fail**

Run: `npx vitest run tests/register.test.ts`
Expected: FAIL — STAFF/LECTURER/COMPANY ได้ 201 · advisorId ถูกบันทึก

- [ ] **Step 3: แก้โค้ด**

`backend/src/schemas/auth.schema.ts`:
```ts
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  nameThai: z.string().min(1),
  role: z.literal(Role.STUDENT).default(Role.STUDENT),
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  profile: z.record(z.any()).default({}),
});
```

`backend/src/controllers/auth.controller.ts` `register`:
- ลบบล็อก `if (role === Role.ADMIN) { ... }` (schema กันแล้ว)
- ใน `tx.user.create` ใช้ `role: Role.STUDENT` แทน `role`
- แทน `switch (role) { ... }` ทั้งก้อนด้วยเนื้อหาของ `case Role.STUDENT` เท่านั้น (ลบ case LECTURER / STAFF / COMPANY / ADMIN)
- ในการสร้าง `studentProfile` ลบบรรทัด `advisorId: profile.advisorId ? String(profile.advisorId) : undefined,`

- [ ] **Step 4: รันทั้งชุด** — `npx vitest run` → PASS ทั้งหมด · `npx tsc --noEmit` → exit 0 (ถ้า `requireFields` หรือ `normalizePhone` กลายเป็น unused ให้เก็บไว้เฉพาะที่ยังถูกใช้ ลบที่ไม่ถูกใช้)

---

### Task 4: ลำดับสิทธิ์ STAFF/ADMIN + รหัสชั่วคราวสุ่ม + `mustChangePassword` (S1 ส่วนที่ 2)

**Files:**
- Create: `backend/src/services/user-policy.ts`, migration `backend/prisma/migrations/<timestamp>_user_must_change_password/`
- Modify: `backend/prisma/schema.prisma` (model User), `backend/src/controllers/system.controller.ts` (`createUserHandler` ~L70-210, import handlers ~L212-410, `updateUserHandler` ~L423-650, `deleteUserHandler` ~L652-690), `backend/src/controllers/auth.controller.ts` (`updateProfile` ~L488-638)
- Test: `backend/tests/user-policy.test.ts`, `backend/tests/users-admin.test.ts`

**Interfaces:**
- Consumes: `app`, `loginAs`, `uniqueEmail` (Task 1), `generateTemporaryPassword()` (Task 2)
- Produces:
  - `canManageRole(actor: Role, target: Role): boolean` — ADMIN จัดการได้ทุก role · STAFF จัดการได้เฉพาะ STUDENT, LECTURER, COMPANY · role อื่นจัดการไม่ได้
  - `canChangeRole(actor: Role): boolean` — true เฉพาะ ADMIN
  - `User.mustChangePassword: boolean` อยู่ใน response ของ `/auth/login`, `/auth/me` (ผ่าน `getUserWithProfiles` อัตโนมัติ)
  - `PATCH /users/profile` ที่ตั้ง `newPassword` สำเร็จ → `mustChangePassword=false` · ต้องมี `currentPassword` เสมอ

- [ ] **Step 1: เขียนเทสต์ pure function ที่ fail**

`backend/tests/user-policy.test.ts`:
```ts
import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canChangeRole, canManageRole } from "../src/services/user-policy";

describe("user policy", () => {
  it("ADMIN can manage every role", () => {
    for (const target of Object.values(Role)) expect(canManageRole(Role.ADMIN, target)).toBe(true);
  });

  it("STAFF can manage only students, lecturers and companies", () => {
    expect(canManageRole(Role.STAFF, Role.STUDENT)).toBe(true);
    expect(canManageRole(Role.STAFF, Role.LECTURER)).toBe(true);
    expect(canManageRole(Role.STAFF, Role.COMPANY)).toBe(true);
    expect(canManageRole(Role.STAFF, Role.STAFF)).toBe(false);
    expect(canManageRole(Role.STAFF, Role.ADMIN)).toBe(false);
  });

  it("other roles manage nobody", () => {
    for (const actor of [Role.STUDENT, Role.LECTURER, Role.COMPANY]) {
      for (const target of Object.values(Role)) expect(canManageRole(actor, target)).toBe(false);
    }
  });

  it("only ADMIN can change roles", () => {
    expect(canChangeRole(Role.ADMIN)).toBe(true);
    expect(canChangeRole(Role.STAFF)).toBe(false);
  });
});
```

- [ ] **Step 2: รันให้เห็น fail** — `npx vitest run tests/user-policy.test.ts` → FAIL (module not found)

- [ ] **Step 3: เขียน `user-policy.ts`**

```ts
import { Role } from "@prisma/client";

const STAFF_MANAGEABLE = new Set<Role>([Role.STUDENT, Role.LECTURER, Role.COMPANY]);

export const canManageRole = (actor: Role, target: Role): boolean => {
  if (actor === Role.ADMIN) return true;
  if (actor === Role.STAFF) return STAFF_MANAGEABLE.has(target);
  return false;
};

export const canChangeRole = (actor: Role): boolean => actor === Role.ADMIN;
```
Run: `npx vitest run tests/user-policy.test.ts` → PASS

- [ ] **Step 4: เพิ่ม field + migration**

`backend/prisma/schema.prisma` ใน `model User` หลังบรรทัด `isActive`:
```prisma
  mustChangePassword Boolean          @default(false)
```
Run:
```bash
cd "/Users/pordiewtrakul/WORK /dii-main-audit/backend"
npx prisma migrate dev --create-only --name user_must_change_password
```
Expected: ไฟล์ migration ใหม่มีแค่ `ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;` → ตรวจแล้วรัน `npx prisma migrate dev` (apply กับ `showpro_main`) และ `npx prisma generate`

- [ ] **Step 5: เขียนเทสต์ API ที่ fail**

`backend/tests/users-admin.test.ts`:
```ts
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, uniqueEmail } from "./helpers/auth";

let staff: string;
let admin: string;

beforeAll(async () => {
  staff = await loginAs("staff@showpro.local");
  admin = await loginAs("admin@showpro.local");
});

const newUser = (role: string, extra: Record<string, unknown> = {}) => ({
  email: uniqueEmail(role.toLowerCase()),
  name: "Created",
  nameThai: "สร้างใหม่",
  role,
  profile: { staffId: `ST${Date.now()}`, lecturerId: `LE${Date.now()}`, companyId: `CO${Date.now()}`, department: "DII", position: "x", companyName: "Co" },
  ...extra,
});

const idOf = async (email: string) => (await prisma.user.findUniqueOrThrow({ where: { email } })).id;

describe("POST /api/users", () => {
  it.each(["ADMIN", "STAFF"])("STAFF cannot create %s", async (role) => {
    const res = await request(app).post("/api/users").set("Authorization", `Bearer ${staff}`).send(newUser(role));
    expect(res.status).toBe(403);
  });

  it("STAFF can create a LECTURER with a random temporary password that must be changed", async () => {
    const body = newUser("LECTURER");
    const res = await request(app).post("/api/users").set("Authorization", `Bearer ${staff}`).send(body);
    expect(res.status).toBe(201);
    expect(res.body.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(res.body.temporaryPassword).not.toBe("Password123!");
    const created = await prisma.user.findUniqueOrThrow({ where: { email: body.email } });
    expect(created.mustChangePassword).toBe(true);
  });

  it("ADMIN can create a STAFF account", async () => {
    const res = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(newUser("STAFF"));
    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/users/:id", () => {
  it("STAFF cannot change anyone's role, including their own", async () => {
    const selfId = await idOf("staff@showpro.local");
    const res = await request(app).patch(`/api/users/${selfId}`).set("Authorization", `Bearer ${staff}`).send({ role: "ADMIN" });
    expect(res.status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: selfId } })).role).toBe("STAFF");
  });

  it("STAFF cannot reset an ADMIN password or deactivate an ADMIN", async () => {
    const adminId = await idOf("admin@showpro.local");
    const pw = await request(app).patch(`/api/users/${adminId}`).set("Authorization", `Bearer ${staff}`).send({ password: "Hijacked123!" });
    expect(pw.status).toBe(403);
    const off = await request(app).patch(`/api/users/${adminId}`).set("Authorization", `Bearer ${staff}`).send({ isActive: false });
    expect(off.status).toBe(403);
    expect(await loginAs("admin@showpro.local")).toBeTruthy();
  });

  it("STAFF can reset a student's password, and the student must change it", async () => {
    const created = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(newUser("STUDENT", { profile: { studentId: `SR${Date.now()}` } }));
    const id = created.body.user.id as string;
    const res = await request(app).patch(`/api/users/${id}`).set("Authorization", `Bearer ${staff}`).send({ password: "Reset12345!" });
    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).mustChangePassword).toBe(true);
  });

  it("ADMIN cannot demote themselves", async () => {
    const adminId = await idOf("admin@showpro.local");
    const res = await request(app).patch(`/api/users/${adminId}`).set("Authorization", `Bearer ${admin}`).send({ role: "STAFF" });
    expect(res.status).toBe(400);
  });

  it("ADMIN can change another user's role", async () => {
    const created = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(newUser("LECTURER"));
    const res = await request(app).patch(`/api/users/${created.body.user.id}`).set("Authorization", `Bearer ${admin}`).send({ role: "STAFF" });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/users/:id", () => {
  it("STAFF cannot deactivate another STAFF", async () => {
    const other = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(newUser("STAFF"));
    const res = await request(app).delete(`/api/users/${other.body.user.id}`).set("Authorization", `Bearer ${staff}`);
    expect(res.status).toBe(403);
  });
});

describe("imports", () => {
  it("company import gives each row a different random password and forces a change", async () => {
    const stamp = Date.now();
    const rows = [1, 2].map((n) => ({
      rowNumber: n + 1,
      companyId: `IMP${stamp}${n}`,
      companyName: `Imported ${n}`,
      phone: `08${String(stamp).slice(-7)}${n}`,
      email: uniqueEmail(`imp${n}`),
      industry: "Software",
      size: "small",
    }));
    const res = await request(app).post("/api/users/import/companies").set("Authorization", `Bearer ${staff}`).send({ rows });
    expect(res.status).toBe(201);
    const passwords = res.body.results.map((r: { temporaryPassword?: string }) => r.temporaryPassword);
    expect(new Set(passwords).size).toBe(2);
    for (const p of passwords) expect(p).not.toBe("Password123!");
    for (const row of rows) {
      expect((await prisma.user.findUniqueOrThrow({ where: { email: row.email } })).mustChangePassword).toBe(true);
    }
  });
});

describe("PATCH /api/users/profile", () => {
  it("cannot change admin super-admin or staff permissions through the profile", async () => {
    // seed sets the admin's isSuperAdmin = true; sending false must be ignored
    await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${admin}`).send({ roleData: { isSuperAdmin: false } });
    const profile = await prisma.adminProfile.findFirstOrThrow({ where: { user: { email: "admin@showpro.local" } } });
    expect(profile.isSuperAdmin).toBe(true);
    const before = await prisma.staffProfile.findFirstOrThrow({ where: { user: { email: "staff@showpro.local" } } });
    await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${staff}`).send({ roleData: { permissions: ["everything"] } });
    const after = await prisma.staffProfile.findFirstOrThrow({ where: { user: { email: "staff@showpro.local" } } });
    expect(after.permissions).toEqual(before.permissions);
  });

  it("changing the email needs the current password", async () => {
    const body = newUser("LECTURER");
    const created = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(body);
    const token = await loginAs(body.email, created.body.temporaryPassword);
    const res = await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${token}`).send({ email: uniqueEmail("moved") });
    expect(res.status).toBe(400);
  });

  it("changing the password clears mustChangePassword and needs the current password", async () => {
    const body = newUser("LECTURER");
    const created = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(body);
    const temp = created.body.temporaryPassword as string;
    const token = await loginAs(body.email, temp);
    const noCurrent = await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${token}`).send({ newPassword: "Mine12345!" });
    expect(noCurrent.status).toBe(400);
    const ok = await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${token}`).send({ currentPassword: temp, newPassword: "Mine12345!" });
    expect(ok.status).toBe(200);
    expect(ok.body.user.mustChangePassword).toBe(false);
  });
});
```
> ตรวจแล้ว: `companyImportRowSchema` บังคับ `companyId, companyName, phone, industry, size` · seed ตั้ง `isSuperAdmin: true` ให้ admin

- [ ] **Step 6: รันให้เห็น fail** — `npx vitest run tests/users-admin.test.ts`
Expected: FAIL หลายข้อ — STAFF สร้าง ADMIN ได้ 201, เปลี่ยน role ตัวเองได้ 200, รหัสเป็น `Password123!`, `mustChangePassword` ไม่ถูกตั้ง ฯลฯ

- [ ] **Step 7: แก้ `system.controller.ts`**

ด้านบนไฟล์ import:
```ts
import { canChangeRole, canManageRole } from "../services/user-policy";
import { generateTemporaryPassword, hashPassword } from "../utils/auth";
```
`createUserHandler` ต้นฟังก์ชัน:
```ts
  const currentUser = requireUser(req);
  if (!canManageRole(currentUser.role, req.body.role)) {
    throw new AppError(403, "You cannot create accounts with this role");
  }
  const temporaryPassword = req.body.password ?? generateTemporaryPassword();
```
และใน `tx.user.create({ data: { ... } })` เพิ่ม `mustChangePassword: true,`

`importCompaniesHandler` และ `importStudentsHandler`: เปลี่ยน `row.password ?? "Password123!"` เป็น `row.password ?? generateTemporaryPassword()` และเพิ่ม `mustChangePassword: true` ใน `user.create` ของทั้งสอง · ตรวจว่าแต่ละ result ที่ status `created` มี `temporaryPassword` (ถ้าโค้ดเดิมไม่ใส่ ให้ใส่)

`updateUserHandler` หลังเช็ค `if (!user)`:
```ts
  if (!canManageRole(currentUser.role, user.role)) {
    throw new AppError(403, "You cannot modify this account");
  }
  if (newRole && newRole !== user.role) {
    if (!canChangeRole(currentUser.role)) {
      throw new AppError(403, "Only an admin can change roles");
    }
    if (user.id === currentUser.id) {
      throw new AppError(400, "You cannot change your own role");
    }
  }
```
(ย้าย 2 บรรทัด `const newRole` / `const roleChanged` ขึ้นมาก่อนบล็อกนี้) และใน `tx.user.update` เพิ่ม `...(newPasswordHash ? { passwordHash: newPasswordHash, mustChangePassword: true } : {}),` แทนบรรทัด passwordHash เดิม · audit log ของ handler นี้ให้บันทึก `role: { from: user.role, to: newRole ?? user.role }` และ `passwordReset: Boolean(newPasswordHash)` เพิ่ม

`deleteUserHandler` ก่อน `prisma.user.update`:
```ts
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    throw new AppError(404, "User not found");
  }
  if (!canManageRole(currentUser.role, target.role)) {
    throw new AppError(403, "You cannot deactivate this account");
  }
```

- [ ] **Step 8: แก้ `updateProfile` ใน `auth.controller.ts`**

- การเปลี่ยนอีเมลต้องมี `currentPassword` ที่ถูกต้อง: ในบล็อก `if (email && email !== existingUser.email)` เพิ่มก่อนเช็คอีเมลซ้ำ
```ts
    if (!currentPassword) {
      throw new AppError(400, "currentPassword is required to change the email");
    }
    if (!(await comparePassword(currentPassword, existingUser.passwordHash))) {
      throw new AppError(401, "Current password is incorrect");
    }
```

- ลบตัวแปร `canSetCompanyFirstPassword` และเงื่อนไขของมัน ให้เหลือ:
```ts
  if (newPassword) {
    if (!currentPassword) {
      throw new AppError(400, "currentPassword is required to set a new password");
    }
    const isPasswordValid = await comparePassword(currentPassword, existingUser.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, "Current password is incorrect");
    }
    passwordHash = await hashPassword(newPassword);
  }
```
- `tx.user.update` เปลี่ยน `...(passwordHash ? { passwordHash } : {}),` เป็น `...(passwordHash ? { passwordHash, mustChangePassword: false } : {}),`
- `case Role.STAFF`: ลบบรรทัด `permissions: ...`
- `case Role.ADMIN`: ลบทั้ง `tx.adminProfile.update(...)` (ไม่มี field ที่ผู้ใช้ควรแก้เองเหลือ) ให้เหลือ `break;`

- [ ] **Step 9: รันทั้งชุด**

Run: `npx vitest run`
Expected: PASS ทั้งหมด · `npx tsc --noEmit` → exit 0

---

### Task 5: ตัด login บริษัทด้วยเบอร์ (S2) + อีเมลไม่สนตัวพิมพ์

**Files:**
- Modify: `backend/src/routes/auth.routes.ts`, `backend/src/schemas/auth.schema.ts`, `backend/src/controllers/auth.controller.ts` (`companyLogin`, `login`, `forgotPassword`), `backend/src/openapi.ts` (ถ้ามี path company-login)
- Test: `backend/tests/company-login.test.ts`

**Interfaces:**
- Consumes: `app`, `loginAs`, `uniqueEmail` (Task 1); `POST /users` ที่สร้างรหัสสุ่ม (Task 4)
- Produces: `POST /api/auth/company-login` → 404 · บริษัทใช้ `POST /api/auth/login` · `login` และ `forgotPassword` ทำ `email.trim().toLowerCase()` ก่อนค้น

- [ ] **Step 1: เขียนเทสต์ที่ fail**

`backend/tests/company-login.test.ts`:
```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, uniqueEmail } from "./helpers/auth";

describe("company sign-in", () => {
  it("phone-only login no longer exists", async () => {
    const company = await prisma.user.findFirstOrThrow({ where: { role: "COMPANY", phone: { not: null } } });
    const res = await request(app).post("/api/auth/company-login").send({ phone: company.phone });
    expect(res.status).toBe(404);
    expect(res.body.token).toBeUndefined();
  });

  it("a company created by staff signs in with email + temporary password", async () => {
    const staff = await loginAs("staff@showpro.local");
    const email = uniqueEmail("co");
    const created = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${staff}`)
      .send({ email, name: "Co", nameThai: "บริษัท", role: "COMPANY", profile: { companyId: `C${Date.now()}`, companyName: "Co" } });
    expect(created.status).toBe(201);
    const res = await request(app).post("/api/auth/login").send({ email, password: created.body.temporaryPassword });
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(true);
  });

  it("login ignores email case", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "TALENT@NorthernSoft.local", password: "Password123!" });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: รันให้เห็น fail** — `npx vitest run tests/company-login.test.ts`
Expected: FAIL — company-login คืน 200 + token · login ตัวพิมพ์ใหญ่ได้ 401

- [ ] **Step 3: แก้โค้ด**

- `auth.routes.ts`: ลบ route `/auth/company-login` และ import `companyLoginSchema`, `companyLogin`
- `auth.schema.ts`: ลบ `companyLoginSchema` · `loginSchema` และ `forgotPasswordSchema` เปลี่ยน email เป็น `z.string().trim().toLowerCase().email()` · `registerSchema` ใช้แบบเดียวกัน
- `auth.controller.ts`: ลบฟังก์ชัน `companyLogin` ทั้งก้อน (และ `normalizePhone` ถ้าไม่มีใครใช้แล้ว)
- `system.schema.ts`: email ใน create user / import rows ใช้ `z.string().trim().toLowerCase().email()` เหมือนกัน (ให้ตรงกับ login)
- `openapi.ts`: ลบ path `/auth/company-login` ถ้ามี

- [ ] **Step 4: รันทั้งชุด** — `npx vitest run` → PASS ทั้งหมด · `npx tsc --noEmit` → exit 0

---

### Task 6: หน้าเว็บตาม API ใหม่ + E2E

**Files:**
- Create: `src/components/common/ForcePasswordChangeDialog.tsx`, `playwright.config.ts`, `e2e/auth-hardening.spec.ts`
- Modify: `src/pages/RegisterPage.tsx`, `src/pages/LoginPage.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/api.ts`, `src/pages/Users.tsx`, `src/components/common/CompanyOnboardingDialog.tsx`, `src/components/layout/DashboardLayout.tsx`, `package.json` (script `test:e2e`)

**Interfaces:**
- Consumes: `user.mustChangePassword` ใน response login/me (Task 4) · `PATCH /api/users/profile {currentPassword,newPassword}` (Task 4) · ไม่มี `/auth/company-login` แล้ว (Task 5)
- Produces: `AuthUser.mustChangePassword: boolean`

- [ ] **Step 1: เขียน E2E ที่ fail**

`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:8080", trace: "retain-on-failure" },
  workers: 1,
});
```
(รันกับ dev server ที่เปิดอยู่: backend :4000 ใช้ DB `showpro_main`, vite :8080 — ไม่ใช่ DB เทสต์)

`e2e/auth-hardening.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

const API = "http://localhost:4000/api";

test("register page offers only the student option", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByText(/staff|เจ้าหน้าที่/i)).toHaveCount(0);
  await expect(page.getByText(/lecturer|อาจารย์/i)).toHaveCount(0);
});

test("login page has no company phone mode", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /^company$/i })).toHaveCount(0);
});

test("a staff-created lecturer must change the temporary password before using the app", async ({ page, request }) => {
  const staffLogin = await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } });
  const staffToken = (await staffLogin.json()).token;
  const email = `e2e-lec-${Date.now()}@example.com`;
  const created = await request.post(`${API}/users`, {
    headers: { Authorization: `Bearer ${staffToken}` },
    data: { email, name: "E2E Lecturer", nameThai: "อาจารย์ทดสอบ", role: "LECTURER", profile: { lecturerId: `E${Date.now()}`, department: "DII", position: "Lecturer" } },
  });
  const temp = (await created.json()).temporaryPassword as string;

  await page.goto("/login");
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', temp);
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: /ตั้งรหัสผ่านใหม่/ });
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("รหัสผ่านชั่วคราว").fill(temp);
  await dialog.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("NewLecturer123!");
  await dialog.getByLabel("ยืนยันรหัสผ่านใหม่").fill("NewLecturer123!");
  await dialog.getByRole("button", { name: "บันทึกรหัสผ่าน" }).click();
  await expect(dialog).toBeHidden();
});

test("staff does not see the staff role or role change controls on the Users page", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type=email]', "staff@showpro.local");
  await page.fill('input[type=password]', "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/users");
  await page.getByRole("button", { name: /เพิ่มผู้ใช้|add user/i }).first().click();
  await page.getByRole("combobox").first().click();
  await expect(page.getByRole("option", { name: /^(staff|เจ้าหน้าที่)$/i })).toHaveCount(0);
});
```
Run (dev servers ต้องเปิดอยู่): `cd "/Users/pordiewtrakul/WORK /dii-main-audit" && npx playwright test`
Expected: FAIL — หน้าสมัครยังมีการ์ด staff/lecturer, มีปุ่ม Company, ไม่มี dialog เปลี่ยนรหัส

- [ ] **Step 2: `api.ts` + `AuthContext.tsx`**

`src/lib/api.ts`: ลบ `companyLogin` ออกจาก `api.auth` · ใน `normalizeUser` เพิ่ม `mustChangePassword: Boolean((user as { mustChangePassword?: boolean }).mustChangePassword),`

`src/contexts/AuthContext.tsx`: เพิ่ม `mustChangePassword: boolean;` ใน `interface AuthUser` · ลบ `companyLogin` ออกจาก `AuthContextType`, จากตัว provider (`useCallback` ที่ L111) และจาก value/deps ของ `useMemo`

- [ ] **Step 3: `LoginPage.tsx`**

ลบ state `loginMode` / `setLoginMode`, ปุ่มสลับโหมด Standard/Company (กลุ่มปุ่มที่มีคำว่า `Company` ~L150-160) และบล็อก `if (loginMode === 'company') { ... }` ใน `handleSubmit` · ช่อง identifier กลับเป็นอีเมลอย่างเดียว (`type="email"`) · toast error ใช้ `t.login.loginFailedDesc` อย่างเดียว · ลบ `companyLogin` จาก `useAuth()`

- [ ] **Step 4: `RegisterPage.tsx`**

`roleOptions` เหลือรายการ `student` อย่างเดียว · ตั้ง `useState` ของ `role` เริ่มต้นเป็น `'student'` เพื่อข้ามขั้นเลือก role (ถ้าหน้ามีขั้นเลือก role แยก ให้ข้ามไปฟอร์มนักศึกษาเลย) · ลบบล็อก `if (role === 'lecturer')`, `if (role === 'staff')`, การสร้าง payload ของ company/enterprise และ type union เหลือ `'student'` · ใน payload ที่ส่ง register ไม่ส่ง `advisorId` ใน profile และลบช่องเลือกอาจารย์ที่ปรึกษาออกจากฟอร์ม (backend เพิกเฉยแล้วใน Task 3)

- [ ] **Step 5: `ForcePasswordChangeDialog.tsx`**

```tsx
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export function ForcePasswordChangeDialog() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = React.useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = React.useState(false);
  const open = Boolean(user?.mustChangePassword);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.next.length < 8) return toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
    if (form.next !== form.confirm) return toast.error('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
    setSaving(true);
    try {
      await updateProfile({ currentPassword: form.current, newPassword: form.next });
      toast.success('ตั้งรหัสผ่านใหม่แล้ว');
      setForm({ current: '', next: '', confirm: '' });
    } catch {
      toast.error('รหัสผ่านชั่วคราวไม่ถูกต้อง');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="leading-snug">ตั้งรหัสผ่านใหม่</DialogTitle>
          <DialogDescription className="leading-relaxed">บัญชีนี้ใช้รหัสผ่านชั่วคราว ตั้งรหัสผ่านของคุณเองก่อนใช้งานต่อ</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5"><Label htmlFor="fpc-current">รหัสผ่านชั่วคราว</Label><Input id="fpc-current" type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required /></div>
          <div className="grid gap-1.5"><Label htmlFor="fpc-next">รหัสผ่านใหม่</Label><Input id="fpc-next" type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required /></div>
          <div className="grid gap-1.5"><Label htmlFor="fpc-confirm">ยืนยันรหัสผ่านใหม่</Label><Input id="fpc-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required /></div>
          <Button type="submit" disabled={saving}>บันทึกรหัสผ่าน</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```
> ตรวจ signature จริงของ `updateProfile` ใน `AuthContext.tsx` ก่อน ถ้ารับ payload คนละรูป ให้ส่ง `{ currentPassword, newPassword }` ตามที่มันส่งต่อให้ `PATCH /users/profile` และตรวจว่าหลังสำเร็จมันเรียก `applySessionUser` กับ user ใหม่ (ถ้าไม่ ให้เพิ่ม) เพื่อให้ `mustChangePassword` เป็น false แล้ว dialog ปิด · ตรวจว่า toast library ของ repo คือ `sonner` (ดู `LoginPage.tsx`) และ path ของ ui component ตรง

- [ ] **Step 6: `DashboardLayout.tsx` + `CompanyOnboardingDialog.tsx`**

`DashboardLayout.tsx`: import และ render `<ForcePasswordChangeDialog />` ข้าง `<CompanyOnboardingDialog />` · render `<CompanyOnboardingDialog />` เฉพาะเมื่อ `!user?.mustChangePassword` (ดึง `user` จาก `useAuth()`)

`CompanyOnboardingDialog.tsx`: ลบช่อง "รหัสผ่านใหม่" (`newPassword` ใน state, validation, `renderLabel('รหัสผ่านใหม่', ...)` และ `newPassword: formData.newPassword || undefined` ใน payload) · ลบ `FIRST_ACCESS_KEY` และ `isFirstAccess` (เหลือ `shouldOpen = Boolean(isCompany && missingRequiredField)`) · ค้นทั้ง repo `grep -rn "showpro_company_first_access" src` แล้วลบที่ตั้งค่า key นี้ด้วย

- [ ] **Step 7: `Users.tsx`**

ดึง role ผู้ใช้ปัจจุบันจาก `useAuth()` · ใน `<Select>` เลือก role (~L680-690): render `<SelectItem value="staff">` เฉพาะเมื่อ `user?.role === 'admin'` · ส่วนแก้ role ของผู้ใช้เดิม (`isRoleChanging` ~L397): ซ่อนตัวควบคุมเปลี่ยน role เมื่อ `user?.role !== 'admin'` และไม่ส่ง `role` ใน payload · ปุ่มแก้ไข/ปิดบัญชี/รีเซ็ตรหัสของแถวที่เป็น staff หรือ admin: ซ่อนเมื่อผู้ใช้ปัจจุบันเป็น staff · ข้อความ toast เมื่อสร้างบัญชีสำเร็จให้บอกว่า "รหัสผ่านชั่วคราว (ผู้ใช้ต้องเปลี่ยนตอนเข้าครั้งแรก): <รหัส>"

- [ ] **Step 8: script + รัน**

Run:
```bash
cd "/Users/pordiewtrakul/WORK /dii-main-audit"
npm pkg set scripts.test:e2e="playwright test"
npx tsc --noEmit -p tsconfig.app.json
npm run build
npx playwright test
```
Expected: tsc exit 0 · build สำเร็จ · Playwright 4/4 PASS (รันซ้ำอีกรอบต้องผ่านเหมือนเดิม เพราะทุกเทสต์ใช้อีเมลไม่ซ้ำ)

- [ ] **Step 9: ตรวจด้วยตาในเบราว์เซอร์** — ถ่ายภาพหน้า `/login`, `/register`, dialog ตั้งรหัสใหม่ และ dialog เพิ่มผู้ใช้ในมุม staff เก็บไว้ที่ `.superpowers/sdd/2026-10-06-audit-s-a-account-takeover/screens/` · ตรวจกฎตัวอักษรไทย (ไม่มี letter-spacing, line-height ตามกฎ)

- [ ] **Step 10: รันทุกอย่างรอบสุดท้าย**

```bash
cd "/Users/pordiewtrakul/WORK /dii-main-audit/backend" && npx vitest run && npx tsc --noEmit
cd "/Users/pordiewtrakul/WORK /dii-main-audit" && npx tsc --noEmit -p tsconfig.app.json && npm run build && npx playwright test
```
Expected: ทั้งหมดผ่าน · ยืนยันสดซ้ำกับ dev server: สมัคร STAFF ผ่าน API ต้องได้ 400 (เดิมได้ 201 แล้วยกเป็น ADMIN ได้)
