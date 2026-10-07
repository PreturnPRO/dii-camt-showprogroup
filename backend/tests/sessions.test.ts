import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/realtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/realtime")>();
  return { ...actual, disconnectSessions: vi.fn() };
});

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authenticateSocketToken, disconnectSessions } from "../src/lib/realtime";
import { revokeSession, revokeSessions } from "../src/services/session.service";
import { loginAs, uniqueEmail } from "./helpers/auth";
import { TEST_JWT_SECRET } from "./setup/test-env";

let staff: string;
let admin: string;
beforeAll(async () => {
  staff = await loginAs("staff@showpro.local");
  admin = await loginAs("admin@showpro.local");
});

// a fresh lecturer with two logins = two devices; seed users are never revoked
async function twoDevices() {
  const email = uniqueEmail("sess");
  const created = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${staff}`)
    .send({ email, name: "Sess", nameThai: "เซสชัน", role: "LECTURER", profile: { lecturerId: `LS${Date.now()}${Math.random()}`, department: "DII", position: "x" } });
  expect(created.status).toBe(201);
  const password = created.body.temporaryPassword as string;
  const a = await loginAs(email, password);
  const b = await loginAs(email, password);
  const id = (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
  return { email, password, id, a, b };
}
const me = (token: string) => request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

describe("per-device sessions", () => {
  it("logout ends only this device's session", async () => {
    const { a, b } = await twoDevices();
    expect((await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${a}`)).status).toBe(200);
    expect((await me(a)).status).toBe(401);
    expect((await me(b)).status).toBe(200);
  });

  it("changing your own password keeps this device and ends the others", async () => {
    const { a, b, password } = await twoDevices();
    const res = await request(app)
      .patch("/api/users/profile")
      .set("Authorization", `Bearer ${a}`)
      .send({ currentPassword: password, newPassword: "BrandNew123!", roleData: {} });
    expect(res.status).toBe(200);
    expect((await me(a)).status).toBe(200);
    expect((await me(b)).status).toBe(401);
  });

  it("staff resetting the password ends every session", async () => {
    const { a, b, id } = await twoDevices();
    expect((await request(app).patch(`/api/users/${id}`).set("Authorization", `Bearer ${staff}`).send({ password: "Reset12345!" })).status).toBe(200);
    expect((await me(a)).status).toBe(401);
    expect((await me(b)).status).toBe(401);
  });

  it("deactivating ends every session; a fresh login works after reactivation", async () => {
    const { a, b, id, email, password } = await twoDevices();
    expect((await request(app).patch(`/api/users/${id}`).set("Authorization", `Bearer ${staff}`).send({ isActive: false })).status).toBe(200);
    expect((await me(a)).status).toBe(401);
    expect((await me(b)).status).toBe(401);
    expect((await request(app).patch(`/api/users/${id}`).set("Authorization", `Bearer ${staff}`).send({ isActive: true })).status).toBe(200);
    expect((await me(await loginAs(email, password))).status).toBe(200);
    expect((await me(a)).status).toBe(401);
  });

  it("deactivating with the UI's delete button ends every session, and reactivation does not revive them", async () => {
    const { a, b, id, email, password } = await twoDevices();
    vi.mocked(disconnectSessions).mockClear();
    expect((await request(app).delete(`/api/users/${id}`).set("Authorization", `Bearer ${staff}`)).status).toBe(200);
    expect(disconnectSessions).toHaveBeenCalled();
    expect((await request(app).patch(`/api/users/${id}`).set("Authorization", `Bearer ${staff}`).send({ isActive: true })).status).toBe(200);
    expect((await me(a)).status).toBe(401);
    expect((await me(b)).status).toBe(401);
    expect((await me(await loginAs(email, password))).status).toBe(200);
  });

  it("two logins at the same moment both succeed", async () => {
    const { email, password } = await twoDevices();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => request(app).post("/api/auth/login").send({ email, password })),
    );
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200]);
  });

  it("a role change ends every session", async () => {
    const { a, b, id } = await twoDevices();
    const res = await request(app).patch(`/api/users/${id}`).set("Authorization", `Bearer ${admin}`).send({ role: "STAFF", roleData: { staffId: `SX${Date.now()}`, department: "DII", position: "x" } });
    expect(res.status).toBe(200);
    expect((await me(a)).status).toBe(401);
    expect((await me(b)).status).toBe(401);
  });

  it("completing a reset-password link ends every session", async () => {
    const { a, b, id, email } = await twoDevices();
    const user = await prisma.user.findUniqueOrThrow({ where: { id }, omit: { passwordHash: false } });
    const marker = createHash("sha256").update(user.passwordHash).digest("hex");
    const token = jwt.sign({ sub: id, email, purpose: "password-reset", marker }, TEST_JWT_SECRET, { expiresIn: "30m" });
    expect((await request(app).post("/api/auth/reset-password").send({ token, password: "AfterReset123!" })).status).toBe(200);
    expect((await me(a)).status).toBe(401);
    expect((await me(b)).status).toBe(401);
  });

  it("rejects access tokens without a session or with an unknown one", async () => {
    const { id, email } = await twoDevices();
    const noSid = jwt.sign({ sub: id, role: "LECTURER", email, typ: "access" }, TEST_JWT_SECRET, { expiresIn: "1h" });
    const badSid = jwt.sign({ sub: id, role: "LECTURER", email, typ: "access", sid: "nope" }, TEST_JWT_SECRET, { expiresIn: "1h" });
    expect((await me(noSid)).status).toBe(401);
    expect((await me(badSid)).status).toBe(401);
  });

  it("an expired session is rejected even if the JWT is still valid", async () => {
    const { a, id } = await twoDevices();
    const { sid } = jwt.decode(a) as { sid: string };
    await prisma.session.update({ where: { id: sid }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await me(a)).status).toBe(401);
    expect(id).toBeTruthy();
  });

  it("login prunes sessions revoked over 30 days ago and keeps recent ones", async () => {
    const { id, email, password } = await twoDevices();
    const old = await prisma.session.create({ data: { userId: id, expiresAt: new Date(Date.now() + 86400000), revokedAt: new Date(Date.now() - 31 * 86400000) } });
    const recent = await prisma.session.create({ data: { userId: id, expiresAt: new Date(Date.now() + 86400000), revokedAt: new Date(Date.now() - 86400000) } });
    await loginAs(email, password);
    expect(await prisma.session.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: recent.id } })).not.toBeNull();
  });

  it("revoking disconnects the revoked sessions' sockets", async () => {
    const { a, b, id } = await twoDevices();
    const sidA = (jwt.decode(a) as { sid: string }).sid;
    const sidB = (jwt.decode(b) as { sid: string }).sid;
    vi.mocked(disconnectSessions).mockClear();
    await revokeSession(sidA);
    expect(disconnectSessions).toHaveBeenCalledWith([sidA]);
    vi.mocked(disconnectSessions).mockClear();
    const revoked = await revokeSessions(id);
    expect(revoked).toEqual([sidB]);
    expect(disconnectSessions).toHaveBeenCalledWith([sidB]);
  });

  it("socket handshake accepts only a live session of an active user", async () => {
    const { a, b, id } = await twoDevices();
    const live = await authenticateSocketToken(b);
    expect(live?.id).toBe(id);
    expect(live?.sessionId).toBe((jwt.decode(b) as { sid: string }).sid);
    await revokeSession((jwt.decode(a) as { sid: string }).sid);
    expect(await authenticateSocketToken(a)).toBeNull();
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    expect(await authenticateSocketToken(b)).toBeNull();
    const noSid = jwt.sign({ sub: id, role: "LECTURER", email: "x", typ: "access" }, TEST_JWT_SECRET, { expiresIn: "1h" });
    expect(await authenticateSocketToken(noSid)).toBeNull();
  });
});
