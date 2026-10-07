# Audit M3 — Basic Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the M3 security gaps still open on branch `Por` (eed1970): leaked internal errors, any-type uploads, CSV formula injection, non-revocable tokens (HTTP + socket), no general rate limit, and self-registration that lets anyone claim any student ID.

**Architecture:** Backend fixes are local: one error handler, one multer `fileFilter`, one CSV cell helper, a per-device `Session` table checked wherever an access token is accepted, and two more `express-rate-limit` limiters. Self-registration is closed. Student accounts are created only by staff import, which the backend already supports, so this plan puts the import UI back on the Users page.

**Tech Stack:** Express + Prisma + passport-jwt + socket.io (backend, vitest + supertest), React + Vite (frontend), Playwright E2E.

**Spec:** Por's rulings of 8/10/69, recorded in `.superpowers/sdd/m3/notes.md`. The audit report is `~/Documents/dii-audit-2026-10/1-backend-auth-security.md`.

## Global Constraints

- **Sessions (Por 8/10/69: per-device):** a `Session` table; every access token carries `sid`. A token is accepted only while its session is not revoked and not expired (and the user is active). Logout revokes **this device's** session only. Changing your own password revokes every **other** session (current device stays logged in, no new token needed). Reset-password link, staff/admin password reset, deactivation and role change revoke **all** sessions. Socket connections of a revoked session are disconnected. Token lifetime stays `JWT_EXPIRES_IN` (7d); session `expiresAt` = same lifetime.
- **Session table hygiene:** expired or revoked sessions older than 30 days are deleted on each successful login (no cron).
- **Upload allowlist:** extensions and MIME types must both match the list `.pdf .jpg .jpeg .png .webp .gif .doc .docx .xls .xlsx .ppt .pptx .zip .csv`. Anything else gets 400. The 20MB limit stays; going over it gets 413.
- **Rate limit:** the whole `/api` is limited to `API_RATE_LIMIT_MAX` (default 300) requests per minute per user, keyed by the verified token `sub`, or by IP when there is no valid token. `POST /api/files/upload` is limited to `UPLOAD_RATE_LIMIT_MAX` (default 30) per hour per user. The existing auth limiter stays unchanged.
- **Registration:** there is no self-registration. `POST /api/auth/register` is removed (404). `/register` in the web app redirects to `/login`, and no page links to it. Staff and admin create student accounts by import (temporary passwords shown in `TemporaryPasswordsDialog`) or by the existing "add user" dialog.
- **Errors:** a 500 response never contains `error.message` from a non-`AppError`. It is logged server-side with `console.error`.
- **Commits:** the email must be `pordeediew001@gmail.com`, with no Co-Authored-By trailer. Make two commits, backend then frontend, and only after Por approves.
- **Process rules:** restart the backend dev server before any E2E run, because tsx watch does not reload. Run a new migration on the dev DB with `npx prisma migrate deploy`. Never use `migrate reset` on the dev DB.

## Review Focus

1. **A user who changes their own password in Settings or ForcePasswordChangeDialog must stay logged in on this device, while their other devices are logged out.** Owned by Task 4, with backend and E2E tests.
2. **A socket that is already connected when its session is revoked (logout on that device, deactivation, password reset) must be disconnected**, not just new handshakes refused; sockets of other still-valid sessions stay. Owned by Task 4, with a unit test on `revokeSessions`.
3. **Legitimate uploads used by the UI must still work:** Requests attachments (pdf/jpg/png), avatar and portfolio images (png/jpeg/webp), and a renamed `evil.png` that is really HTML. Owned by Task 2, with tests.
4. **The E2E suite (~82 tests, many logins from one IP) must not trip the new API limiter.** Owned by Task 5, which runs the full E2E suite.
5. **CSV cells that start with `=`, `+`, `-`, `@`, tab or CR are neutralised, but negative numeric scores are not mangled.** Owned by Task 3, with tests.

---

### Task 1: Error handler never leaks internal messages

**Files:**
- Modify: `backend/src/middleware/error-handler.ts`
- Test: `backend/tests/error-handler.test.ts` (create)

**Interfaces:** Produces the same `errorHandler` signature. It maps Prisma `P2002` to 409 "This record already exists" and `P2025` to 404 "Record not found". Body-parser errors that carry `status`/`statusCode` of 400 or 413 keep that status with the message "Invalid request body". Multer `LIMIT_FILE_SIZE` gives 413 "File is too large (max 20MB)". Everything else gives 500 "Unexpected error while processing request".

- [ ] **Step 1: Write the failing tests.** Build a tiny express app with routes that throw each error and mount `errorHandler`:

```ts
import express from "express";
import request from "supertest";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/error-handler";
import { AppError } from "../src/utils/errors";

const appThrowing = (err: unknown) => {
  const app = express();
  app.use(express.json());
  app.post("/x", () => { throw err; });
  app.use(errorHandler);
  return app;
};
const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Invalid `prisma.user.create()` invocation: secret internals", { code, clientVersion: "x" });

describe("errorHandler", () => {
  it("keeps AppError messages", async () => {
    const res = await request(appThrowing(new AppError(403, "nope"))).post("/x");
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("nope");
  });
  it("hides a raw Error behind a generic 500 and logs it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(appThrowing(new Error("connect ECONNREFUSED 10.0.0.5:5432"))).post("/x");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it("maps Prisma P2002 to 409 and P2025 to 404 without internals", async () => {
    const a = await request(appThrowing(known("P2002"))).post("/x");
    expect(a.status).toBe(409);
    expect(JSON.stringify(a.body)).not.toContain("prisma");
    const b = await request(appThrowing(known("P2025"))).post("/x");
    expect(b.status).toBe(404);
  });
  it("other Prisma errors are a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(appThrowing(known("P2003"))).post("/x");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("invocation");
  });
  it("malformed JSON is a 400, not a 500", async () => {
    const app = appThrowing(new Error("unused"));
    const res = await request(app).post("/x").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
  });
  it("multer file-size errors are a 413", async () => {
    const res = await request(appThrowing(new multer.MulterError("LIMIT_FILE_SIZE"))).post("/x");
    expect(res.status).toBe(413);
  });
});
```

- [ ] **Step 2:** Run `cd backend && npx vitest run tests/error-handler.test.ts`. Expected: FAIL. A raw Error returns its message, P2002 returns 500, malformed JSON returns 500, and multer returns 500.
- [ ] **Step 3: Implement.**

```ts
import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { AppError } from "../utils/errors";

const send = (res: Response, status: number, message: string, details: unknown = null) =>
  res.status(status).json({ success: false, message, details });

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) return send(res, error.statusCode, error.message, error.details ?? null);
  if (error instanceof multer.MulterError) {
    return error.code === "LIMIT_FILE_SIZE"
      ? send(res, 413, "File is too large (max 20MB)")
      : send(res, 400, "Invalid file upload");
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return send(res, 409, "This record already exists");
    if (error.code === "P2025") return send(res, 404, "Record not found");
  }
  // body-parser marks its own errors (bad JSON, too large) with a 4xx status
  const status = (error as { status?: unknown; statusCode?: unknown })?.status ?? (error as { statusCode?: unknown })?.statusCode;
  if (status === 400 || status === 413) return send(res, status, "Invalid request body");

  // anything else is ours: log it, but never show internals (Prisma queries, hosts, stack) to the caller
  console.error(`[${req.method} ${req.originalUrl}]`, error);
  return send(res, 500, "Unexpected error while processing request");
};
```

- [ ] **Step 4:** Run the new test, then the full backend suite: `cd backend && npm test`. Expected: all pass. If an existing test asserted a raw message, convert that throw site to `AppError` rather than weakening the handler.

### Task 2: Upload allowlist

**Files:**
- Modify: `backend/src/services/file-storage.service.ts`, which gets the `fileFilter`
- Modify: `src/pages/Settings.tsx:345`, `src/pages/Portfolio.tsx:961`, changing `accept="image/*"` to `accept="image/png,image/jpeg,image/webp,image/gif"`
- Test: `backend/tests/upload-allowlist.test.ts` (create)

**Interfaces:** Produces `isAllowedUpload(originalName: string, mimeType: string): boolean`, exported from `file-storage.service.ts`.

- [ ] **Step 1: Write the failing tests.** Run them against `/api/files/upload` as alice, with buffers:

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { isAllowedUpload } from "../src/services/file-storage.service";
import { loginAs } from "./helpers/auth";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const upload = (token: string, name: string, type: string, body = PNG) =>
  request(app).post("/api/files/upload").set("Authorization", `Bearer ${token}`).attach("file", body, { filename: name, contentType: type });

describe("upload allowlist", () => {
  it("accepts the types the UI uploads", async () => {
    const t = await loginAs("alice@student.showpro.local");
    for (const [n, m] of [["a.pdf", "application/pdf"], ["a.png", "image/png"], ["a.jpg", "image/jpeg"], ["a.webp", "image/webp"],
      ["a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["a.zip", "application/zip"]]) {
      expect((await upload(t, n, m)).status, n).toBe(201);
    }
  });
  it.each([["evil.html", "text/html"], ["evil.svg", "image/svg+xml"], ["evil.exe", "application/x-msdownload"],
    ["evil.js", "text/javascript"], ["evil.png", "text/html"], ["evil.html", "image/png"], ["noext", "application/pdf"]])(
    "rejects %s (%s) with 400", async (n, m) => {
      const t = await loginAs("alice@student.showpro.local");
      const res = await upload(t, n, m);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not allowed/i);
    });
  it("extension check ignores case", () => {
    expect(isAllowedUpload("CV.PDF", "application/pdf")).toBe(true);
  });
});
```

  Before writing the success test, check the upload handler's real success status (`files.controller.ts` `uploadFile`). If it is 200 rather than 201, use that.

- [ ] **Step 2:** Run `npx vitest run tests/upload-allowlist.test.ts`. Expected: the reject cases FAIL because everything gets 201.
- [ ] **Step 3: Implement** in `file-storage.service.ts`:

```ts
// extension → MIME types we accept for it; both must match (a renamed .html sent as image/png is refused)
const ALLOWED_UPLOADS: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".jpg": ["image/jpeg"], ".jpeg": ["image/jpeg"], ".png": ["image/png"], ".webp": ["image/webp"], ".gif": ["image/gif"],
  ".doc": ["application/msword"], ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"], ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".ppt": ["application/vnd.ms-powerpoint"], ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".zip": ["application/zip", "application/x-zip-compressed"],
  ".csv": ["text/csv", "application/vnd.ms-excel"],
};

export const isAllowedUpload = (originalName: string, mimeType: string) =>
  ALLOWED_UPLOADS[path.extname(originalName).toLowerCase()]?.includes(mimeType.toLowerCase()) ?? false;

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) =>
    isAllowedUpload(file.originalname, file.mimetype)
      ? callback(null, true)
      : callback(new AppError(400, "This file type is not allowed (PDF, images, Office documents, ZIP or CSV only)")),
});
```

  Import `AppError` from `../utils/errors`.
- [ ] **Step 4:** Change the two `accept="image/*"` inputs (Settings avatar, Portfolio) to `image/png,image/jpeg,image/webp,image/gif`. Then run the new test and `npm test` in backend. Expected: PASS.

### Task 3: CSV export cannot inject formulas

**Files:**
- Create: `backend/src/utils/csv.ts`
- Modify: `backend/src/controllers/academic.controller.ts:196-213`, which uses the helper for every cell
- Test: `backend/tests/csv-cell.test.ts` (create), plus one API assertion

**Interfaces:** Produces `csvCell(value: unknown): string`. It returns a quoted, escaped cell. A string that starts with `= + - @ \t \r` gets a leading `'`. Numbers are written as plain numbers. `null` and `undefined` become an empty cell.

- [ ] **Step 1: Write the failing tests.**

```ts
import { describe, expect, it } from "vitest";
import { csvCell } from "../src/utils/csv";

describe("csvCell", () => {
  it.each([["=HYPERLINK(\"http://x\")", "\"'=HYPERLINK(\"\"http://x\"\")\""], ["+1", "\"'+1\""], ["-2+3", "\"'-2+3\""],
    ["@SUM(A1)", "\"'@SUM(A1)\""], ["\tx", "\"'\tx\""], ["สมชาย", "\"สมชาย\""], ["a\"b", "\"a\"\"b\""]])("%s", (input, out) => {
    expect(csvCell(input)).toBe(out);
  });
  it("keeps numbers (including negatives) numeric", () => {
    expect(csvCell(-1.5)).toBe("-1.5");
    expect(csvCell(80)).toBe("80");
  });
  it("blank for null/undefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});
```

  Add an API test to `backend/tests/csv-cell.test.ts`. As staff, set `remarks` to `=1+1` on one enrollment of a seeded course with prisma. Then `GET /api/courses/:id/grades/export`, and expect the body to contain `"'=1+1"` and not `,"=1+1"`. Restore the remark in `afterAll`.
- [ ] **Step 2:** Run it. Expected: FAIL because the module is missing.
- [ ] **Step 3: Implement** `backend/src/utils/csv.ts`:

```ts
// a cell a spreadsheet would run as a formula (=, +, -, @, tab, CR) gets a leading ' so it is shown as text
const FORMULA_START = /^[=+\-@\t\r]/;

export const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  const text = String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");
```

  Rewrite the export body in `exportGradesCsvHandler` to build the header and each row with `csvRow([...])`, so every string cell (studentId, name, component name with maxScore, letterGrade, remarks) goes through `csvCell`. Scores and totals stay numbers.
- [ ] **Step 4:** Run the test and the full backend suite. Expected: PASS.

### Task 4: Per-device sessions for HTTP and socket

**Files:**
- Modify: `backend/prisma/schema.prisma` — new model + relation on `User` (`sessions Session[]`):

```prisma
model Session {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime  @default(now())
  expiresAt  DateTime
  revokedAt  DateTime?
  userAgent  String?

  @@index([userId])
}
```

- Create: `backend/prisma/migrations/20261008120000_sessions/migration.sql` (generate with `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` against the test DB URL, or write by hand: `CREATE TABLE "Session" (...)`, index, FK with `ON DELETE CASCADE`)
- Create: `backend/src/services/session.service.ts`
- Modify: `backend/src/utils/auth.ts` (`signToken` adds `sid`; `isAccessPayload` requires a string `sid`)
- Modify: `backend/src/lib/passport.ts` (strategy + `optionalAuth` check the session; `req.user.sessionId`), `backend/src/types/express.d.ts` or wherever `req.user` is typed (add `sessionId: string`), `backend/src/lib/realtime.ts` (handshake check, join room `session:<sid>`, `disconnectSessions`), `backend/src/controllers/auth.controller.ts` (login, logout, reset-password, updateProfile), `backend/src/controllers/system.controller.ts` (admin update: password reset / deactivate / role change)
- Test: `backend/tests/sessions.test.ts` (create), `e2e/session-revocation.spec.ts` (create)

**Interfaces:**
- `signToken(payload: { sub: string; role: Role; email: string; sid: string }): string`
- `session.service.ts`:
  - `createSession(userId: string, userAgent?: string): Promise<{ id: string; expiresAt: Date }>` — `expiresAt = now + JWT lifetime` (parse `env.JWT_EXPIRES_IN` with the `ms`-style helper jsonwebtoken already depends on, or store the token's `exp` after signing — simplest: sign first with `sid`, read `exp` via `jwt.decode`, then create; so instead expose `issueSessionToken(user, userAgent): Promise<string>` that creates the session row, signs with its id, and updates `expiresAt` from the token's `exp`)
  - `issueSessionToken(user: { id: string; role: Role; email: string }, userAgent?: string): Promise<string>` — also prunes this user's sessions that are expired or revoked > 30 days ago
  - `isSessionLive(sessionId: string, userId: string): Promise<boolean>` — exists, belongs to user, `revokedAt` null, `expiresAt` > now
  - `revokeSession(sessionId: string): Promise<void>` — sets `revokedAt`, disconnects that session's sockets
  - `revokeSessions(userId: string, opts?: { except?: string; tx?: Prisma.TransactionClient }): Promise<string[]>` — revokes all live sessions of the user except `except`; returns revoked ids; disconnects their sockets **after** the transaction (callers inside a transaction call `disconnectSessions(ids)` after commit)
- `realtime.ts`: `authenticateSocketToken(token: string): Promise<{ id: string; role: Role; email: string; sessionId: string } | null>`; `disconnectSessions(sessionIds: string[]): void` (no-op when io not started)
- `req.user.sessionId: string` available to controllers behind `requireAuth`

Note: tokens issued before this change have no `sid` and are rejected — everyone logs in again once (same as the token-key rename).

- [ ] **Step 1: Write the failing backend tests** in `sessions.test.ts` (supertest + `loginAs`/`uniqueEmail`; each test creates its own user via staff `POST /api/users` like `users-admin.test.ts`, then logs in twice to get tokens A and B = two devices — never revoke seed users):
  1. logout with A → A gets 401 on `/api/auth/me`, **B still 200**
  2. `PATCH /api/users/profile {currentPassword,newPassword}` with A → A still 200, B 401
  3. staff `PATCH /api/users/:id {password}` → A and B both 401
  4. staff `PATCH /api/users/:id {isActive:false}` → A and B 401; after `{isActive:true}` a fresh login is 200
  5. staff role change (`PATCH /api/users/:id {role}` as the users-admin tests do it) → A and B 401
  6. reset-password link flow (forgot → `resetToken` from the response; see `tests/forgot-password.test.ts` for how tests get it) → A and B 401
  7. a correctly signed access token without `sid`, and one with a random `sid` → 401
  8. a session whose `expiresAt` is in the past (update via prisma) → 401
  9. pruning: create a revoked session with `revokedAt` 31 days ago via prisma; after a login it is gone; a revoked one from yesterday stays
  10. `revokeSessions` / `revokeSession` call `disconnectSessions` with the revoked ids (`vi.mock("../src/lib/realtime", …)`)
  11. `authenticateSocketToken`: null for a revoked session, for an inactive user, for a token without `sid`; the user (with `sessionId`) for a live one
- [ ] **Step 2: Run** `npx vitest run tests/sessions.test.ts` → FAIL (no Session model / helpers)
- [ ] **Step 3: Schema + migration**, then `npx prisma generate` (test DB is rebuilt by global-setup; dev DB: `npx prisma migrate deploy`)
- [ ] **Step 4: Implement**
  - `session.service.ts` as in Interfaces. `issueSessionToken`:

```ts
export const issueSessionToken = async (user: { id: string; role: Role; email: string }, userAgent?: string) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.session.deleteMany({
    where: { userId: user.id, OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
  });
  const session = await prisma.session.create({ data: { userId: user.id, userAgent: userAgent?.slice(0, 255), expiresAt: new Date() } });
  const token = signToken({ sub: user.id, role: user.role, email: user.email, sid: session.id });
  const { exp } = jwt.decode(token) as { exp: number };
  await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date(exp * 1000) } });
  return token;
};
```

  (The prune deletes expired sessions immediately and revoked ones after 30 days, so a just-revoked session stays visible for audits.)
  - `passport.ts` strategy: select user `isActive`; reject unless `user?.isActive && await isSessionLive(payload.sid, user.id)`; pass `sessionId: payload.sid` in `req.user`. Same check in `optionalAuth`.
  - `realtime.ts`: `authenticateSocketToken` does verify → `isAccessPayload` → user lookup → `isActive` → `isSessionLive`; `io.use` uses it (`null` with a token present → `next(new Error("Unauthorized"))`); on connection also `socket.join(\`session:${user.sessionId}\`)`; `disconnectSessions = (ids) => ids.forEach((id) => io?.in(\`session:${id}\`).disconnectSockets(true))`.
  - `auth.controller.ts`: login → `token = await issueSessionToken(user, req.get("user-agent"))`; logout → `await revokeSession(currentUser.sessionId)`; reset-password → after the update `await revokeSessions(user.id)`; updateProfile → inside the transaction when `passwordHash`: `revoked = await revokeSessions(currentUser.id, { except: currentUser.sessionId, tx })`, after commit `disconnectSessions(revoked)`.
  - `system.controller.ts` admin update: inside the transaction when `newPasswordHash || req.body.isActive === false || roleChanged`: `revoked = await revokeSessions(user.id, { tx })`; after commit `disconnectSessions(revoked)`.
  - Any other `signToken(` caller (grep) switches to `issueSessionToken`.
- [ ] **Step 5: E2E** `e2e/session-revocation.spec.ts`:
  1. log in via API (token B = "other device"), log in in the UI, click logout → `GET /api/auth/me` with B is **200** (other device unaffected)
  2. staff creates a user via API (temp password); log in via API as that user (token B); log in in the UI → ForcePasswordChangeDialog → change password → still on `/dashboard` after `page.reload()` (this device stays), and `/api/auth/me` with B → 401
- [ ] **Step 6:** run backend suite, new E2E, then full E2E (restart backend dev server first) → all pass

### Task 5: General API and upload rate limits

**Files:**
- Modify: `backend/src/config/env.ts`, adding `API_RATE_LIMIT_MAX` (default 300) and `UPLOAD_RATE_LIMIT_MAX` (default 30)
- Modify: `backend/.env.example`
- Modify: `backend/src/app.ts`, where `createApp` options gain `apiRateLimitMax?`, `uploadRateLimitMax?`
- Test: `backend/tests/api-rate-limit.test.ts` (create)

**Interfaces:** `createApp({ authRateLimitMax?, apiRateLimitMax?, uploadRateLimitMax? })`.

- [ ] **Step 1: Write the failing tests.**
  1. `createApp({ apiRateLimitMax: 3 })`: 3× `GET /api/auth/me` with alice's token give 200, and the 4th gives 429.
  2. Same app: bob's token still gets 200 after alice is limited, because the key is the user, not the IP.
  3. With no token, the key is the IP. 4 anonymous `GET /api/files/public/x` requests: the 4th gives 429.
  4. A forged token whose `sub` is alice's id, signed with the wrong secret, must not consume alice's budget. Send 3 forged requests, then alice gets 200.
  5. `createApp({ uploadRateLimitMax: 1 })`: the 2nd upload in the window gives 429, and a non-upload `GET` still gives 200.
- [ ] **Step 2:** Run them. Expected: FAIL because there is no limiter.
- [ ] **Step 3: Implement** in `createApp`, before `app.use("/api", router)` and after the auth limiters:

```ts
// key a request by its verified user, else by IP — a forged token must not spend someone else's budget
const rateKey = (req: express.Request) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_SECRET);
      if (isAccessPayload(payload)) return `u:${payload.sub}`;
    } catch { /* fall through to IP */ }
  }
  return `ip:${req.ip}`;
};
app.use("/api", rateLimit({ windowMs: 60_000, limit: options.apiRateLimitMax ?? env.API_RATE_LIMIT_MAX, keyGenerator: rateKey,
  standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, message: "Too many requests. Please slow down." } }));
app.post("/api/files/upload", rateLimit({ windowMs: 60 * 60_000, limit: options.uploadRateLimitMax ?? env.UPLOAD_RATE_LIMIT_MAX, keyGenerator: rateKey,
  standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, message: "Too many uploads. Please try again later." } }));
```

  Express-rate-limit v7 warns about custom key generators that use `req.ip` with IPv6. If it does, use its exported `ipKeyGenerator(req.ip)` helper when available, or keep `req.ip`. Verify against the installed version.
- [ ] **Step 4:** Run the new test and the full backend suite. Restart the backend dev server, then run the full E2E. If E2E hits 429, raise the dev `.env` `API_RATE_LIMIT_MAX` and note it in the ledger. Do not raise the production default.

### Task 6: Close self-registration (backend + web)

**Files:**
- Modify: `backend/src/routes/auth.routes.ts` (remove the `/auth/register` route), `backend/src/controllers/auth.controller.ts` (remove `register`), `backend/src/schemas/auth.schema.ts` (remove `registerSchema`), the openApi spec entry for register if present (`grep -rn "auth/register" backend/src`)
- Modify: `backend/tests/register.test.ts`, rewritten to assert that `POST /api/auth/register` gives 404 and creates no user
- Delete: `src/pages/RegisterPage.tsx`
- Modify: `src/App.tsx` (`/register` → `<Navigate to="/login" replace />`), `src/pages/LoginPage.tsx:177` (remove the "no account? register" line), `src/pages/LandingPage.tsx` (4 `/register` links → `/login`, labelled with the existing login text), `src/components/common/GlobalPreloader.tsx` (drop `/register`), `src/contexts/AuthContext.tsx` (remove `register` + `RegisterPayload`), `src/lib/api.ts` (remove `auth.register`), i18n keys only used by the register page (`grep` before deleting)
- Test: `e2e/no-self-register.spec.ts` (create)

- [ ] **Step 1: Write the failing tests.**
  - The backend `register.test.ts` expects 404 for a STUDENT body, and `prisma.user.findUnique({ where: { email } })` stays null.
  - E2E:
    1. `page.goto("/register")` lands on `/login`.
    2. `/login` and `/` have no `a[href="/register"]`.
- [ ] **Step 2:** Run both. Expected: FAIL, with 201 and a register page.
- [ ] **Step 3: Implement** the removals listed under Files. On the landing page, the CTA buttons that said "สมัคร/Register" now go to `/login` with the login label (`t.login...` or the existing "เข้าสู่ระบบ" string used in the landing nav). Do not invent new copy.
- [ ] **Step 4:** Run `npx tsc --noEmit -p tsconfig.app.json` (only the 2 baseline errors may remain), the backend suite and the two E2E specs. Expected: PASS.

### Task 7: Student import back on the Users page

**Files:**
- Modify: `src/pages/Users.tsx`. Add a button "Import นักศึกษา" next to "Import บริษัท" (line ~492), plus a second `ImportMappingDialog` with `studentImportFields`, and `handleStudentImport`.
- Test: `e2e/student-import.spec.ts` (create)

**Interfaces:**
- Consumes `api.users.importStudents(rows)` (exists, `src/lib/api.ts:402`), `studentImportFields`, `buildSafeIdentifier`, `credentialsFromImport`, and `TemporaryPasswordsDialog` (already mounted, driven by `setCredentials`).
- The payload is the same as `a02a4d8:src/pages/Students.tsx` `buildStudentImportPayload` and `handleStudentImport` (copied below).

- [ ] **Step 1: Write the failing E2E.**
  - Log in as staff and go to `/users`, then click the "Import นักศึกษา" button.
  - Upload a CSV via `setInputFiles` with `{ name: "students.csv", mimeType: "text/csv", buffer }`. It has header `studentId,name,nameThai,email,academicYear` and one row with a unique id and `e2e-imp-<stamp>@example.com`.
  - Confirm the mapping. Check `ImportMappingDialog` for its confirm button text before writing the selector.
  - Expect the temporary-password dialog to contain the email. Logging in with that temp password via the API gives 200.
  - Then log in as alice (student), go to `/users`, and expect a redirect to `/dashboard`, so there is no import button for students.
- [ ] **Step 2:** Run it. Expected: FAIL, because the button does not exist.
- [ ] **Step 3: Implement.**

```tsx
const [isStudentImportOpen, setIsStudentImportOpen] = useState(false);

const handleStudentImport = async (rows: MappedImportRow[]) => {
  const response = await api.users.importStudents(
    rows.map((row) => {
      const values = row.values;
      const name = values.name;
      return {
        rowNumber: row.rowNumber,
        studentId: values.studentId,
        major: values.major || 'Digital Industry Integration',
        program: values.program || 'bachelor',
        year: Number(values.year || 1),
        semester: Number(values.semester || 1),
        academicYear: values.academicYear,
        academicStatus: values.academicStatus || 'normal',
        name,
        nameThai: values.nameThai || name,
        email: values.email || `${buildSafeIdentifier(values.studentId, `student${row.rowNumber}`)}@student.showpro.local`,
        phone: values.phone || undefined,
        password: values.password || undefined,
      };
    }),
  );

  await loadUsers();
  setCredentials(credentialsFromImport(response.results));
  toast.success(`Import นักศึกษาสำเร็จ ${response.createdCount} รายการ`);
  if (response.failedCount > 0) {
    toast.error(`Import นักศึกษาไม่สำเร็จ ${response.failedCount} รายการ`);
  }
  return { successCount: response.createdCount, failureCount: response.failedCount };
};
```

  Button, placed next to "Import บริษัท" with the same styling:

```tsx
<Button variant="outline" onClick={() => setIsStudentImportOpen(true)} className="rounded-xl">
  <Upload className="w-4 h-4 mr-2" />
  Import นักศึกษา
</Button>
```

  Dialog, placed next to the company `ImportMappingDialog`:

```tsx
<ImportMappingDialog
  open={isStudentImportOpen}
  onOpenChange={setIsStudentImportOpen}
  title="Import รายชื่อนักศึกษา"
  description="อัปโหลด Excel/CSV ของรุ่นนั้น ๆ แล้วกำหนดคอลัมน์ก่อนสร้างบัญชีนักศึกษา"
  fields={studentImportFields}
  onImport={handleStudentImport}
/>
```

  Add `studentImportFields` to the `@/lib/import-mapping` import. Check the backend `importStudentsHandler` row shape (`system.controller.ts` ~228) against these field names before running: is it flat, or `profile`-nested? The old Students page spread `profile` flat, which is what is shown above.
- [ ] **Step 4:** Run the new E2E, then the full E2E suite (restart the backend dev server first). Expected: PASS.

### Finish

- [ ] Final review (opus) of the whole M3 diff, then fix Important findings test-first.
- [ ] Record rulings and deferred minors in `~/Documents/dii-audit-2026-10/m3-ledger.md`.
- [ ] Ask Por to approve the two commits (backend: tasks 1–6 backend parts; frontend: tasks 2/4/6/7 web parts + E2E).

## Decisions

- Logout = this device only; per-device `Session` table instead of `tokenVersion` (Por 8/10/69).
