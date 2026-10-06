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
    const res = await request(app).get("/api/files/public/does-not-exist").set("Authorization", `Bearer ${resetLike}`);
    expect([401, 404]).toContain(res.status);
  });
});
