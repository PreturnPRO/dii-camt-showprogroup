import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/utils/auth";
import { loginAs, uniqueEmail } from "./helpers/auth";

describe("admin cannot lock themselves out", () => {
  it("rejects PATCH isActive:false on your own account", async () => {
    const admin = await loginAs("admin@showpro.local");
    const me = await prisma.user.findUniqueOrThrow({ where: { email: "admin@showpro.local" } });
    const res = await request(app).patch(`/api/users/${me.id}`).set("Authorization", `Bearer ${admin}`).send({ isActive: false });
    expect(res.status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: me.id } })).isActive).toBe(true);
  });
});

describe("existing accounts stored with uppercase emails", () => {
  it("can still log in", async () => {
    const stored = uniqueEmail("Mixed").replace("mixed", "Mixed").toUpperCase();
    await prisma.user.create({ data: { email: stored, passwordHash: await hashPassword("Password123!"), name: "M", nameThai: "เอ็ม", role: "STUDENT" } });
    const login = await request(app).post("/api/auth/login").send({ email: stored.toLowerCase(), password: "Password123!" });
    expect(login.status).toBe(200);
  });
});
