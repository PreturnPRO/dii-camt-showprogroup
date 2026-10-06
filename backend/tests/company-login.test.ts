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
