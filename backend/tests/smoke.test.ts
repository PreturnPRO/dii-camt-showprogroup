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
