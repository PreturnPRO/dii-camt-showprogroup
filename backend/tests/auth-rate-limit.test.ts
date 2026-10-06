import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { loginAs } from "./helpers/auth";

const wrongLogin = (app: ReturnType<typeof createApp>, email = "nobody@example.com") =>
  request(app).post("/api/auth/login").send({ email, password: "wrongpass1" });

describe("rate limit on auth actions", () => {
  it("returns 429 after the configured number of failed logins for one IP + email", async () => {
    const app = createApp({ authRateLimitMax: 3 });
    expect((await wrongLogin(app)).status).toBe(401);
    expect((await wrongLogin(app)).status).toBe(401);
    expect((await wrongLogin(app)).status).toBe(401);
    expect((await wrongLogin(app)).status).toBe(429);
  });

  it("gives each email its own budget, so students behind one campus NAT don't block each other", async () => {
    const app = createApp({ authRateLimitMax: 1 });
    await wrongLogin(app, "a@example.com");
    expect((await wrongLogin(app, "a@example.com")).status).toBe(429);
    expect((await wrongLogin(app, "b@example.com")).status).toBe(401);
  });

  it("does not count successful logins", async () => {
    const app = createApp({ authRateLimitMax: 2 });
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app).post("/api/auth/login").send({ email: "alice@student.showpro.local", password: "Password123!" });
      expect(res.status).toBe(200);
    }
  });

  it("limits forgot-password requests", async () => {
    const app = createApp({ authRateLimitMax: 2 });
    const ask = () => request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
    expect((await ask()).status).toBe(200);
    expect((await ask()).status).toBe(200);
    expect((await ask()).status).toBe(429);
  });

  it("never limits GET /auth/me (called on every page load)", async () => {
    const app = createApp({ authRateLimitMax: 1 });
    const token = await loginAs("alice@student.showpro.local");
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
  });

  it("does not limit non-auth routes", async () => {
    const app = createApp({ authRateLimitMax: 1 });
    await request(app).get("/health");
    expect((await request(app).get("/health")).status).toBe(200);
  });
});
