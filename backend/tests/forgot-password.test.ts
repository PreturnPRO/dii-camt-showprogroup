import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/utils/auth";
import { loginAs, uniqueEmail } from "./helpers/auth";

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

describe("GET /api/auth/password-reset-available", () => {
  // Por 8/10/69: with no email delivery the page must send people to staff, not claim a link was sent
  it("says self-service reset is off when no delivery webhook is configured", async () => {
    const res = await request(app).get("/api/auth/password-reset-available");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, available: false });
  });
});
