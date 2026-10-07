import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const me = (app: ReturnType<typeof createApp>, token: string) =>
  request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

describe("general API rate limit", () => {
  it("returns 429 once a user goes over the per-minute budget", async () => {
    const app = createApp({ apiRateLimitMax: 3 });
    const alice = await loginAs("alice@student.showpro.local");
    for (let i = 0; i < 3; i += 1) expect((await me(app, alice)).status).toBe(200);
    expect((await me(app, alice)).status).toBe(429);
  });

  it("counts per user, not per IP: another user is unaffected", async () => {
    const app = createApp({ apiRateLimitMax: 3 });
    const alice = await loginAs("alice@student.showpro.local");
    const staff = await loginAs("staff@showpro.local");
    for (let i = 0; i < 4; i += 1) await me(app, alice);
    expect((await me(app, staff)).status).toBe(200);
  });

  it("counts anonymous requests per IP", async () => {
    const app = createApp({ apiRateLimitMax: 3 });
    for (let i = 0; i < 3; i += 1) expect((await request(app).get("/api/files/public/nope")).status).not.toBe(429);
    expect((await request(app).get("/api/files/public/nope")).status).toBe(429);
  });

  it("a forged token naming a user does not spend that user's budget", async () => {
    const app = createApp({ apiRateLimitMax: 3 });
    const alice = await loginAs("alice@student.showpro.local");
    const { id } = await prisma.user.findUniqueOrThrow({ where: { email: "alice@student.showpro.local" } });
    const forged = jwt.sign({ sub: id, typ: "access", sid: "x" }, "not-the-real-secret-123456");
    for (let i = 0; i < 3; i += 1) await me(app, forged);
    expect((await me(app, alice)).status).toBe(200);
  });
});

describe("upload rate limit", () => {
  it("returns 429 once a user goes over the hourly upload budget; other calls still work", async () => {
    const app = createApp({ uploadRateLimitMax: 1 });
    const alice = await loginAs("alice@student.showpro.local");
    const upload = () =>
      request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${alice}`)
        .attach("file", PNG, { filename: "a.png", contentType: "image/png" });
    expect((await upload()).status).toBe(201);
    expect((await upload()).status).toBe(429);
    expect((await me(app, alice)).status).toBe(200);
  });
});
