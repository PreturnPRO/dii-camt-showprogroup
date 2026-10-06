import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const get = async (path: string, email: string) => request(app).get(path).set("Authorization", `Bearer ${await loginAs(email)}`);

describe("directory PII", () => {
  it("students and companies never get phone numbers from the directory", async () => {
    for (const email of ["alice@student.showpro.local", "talent@northernsoft.local"]) {
      const res = await get("/api/directory/users", email);
      expect(res.status).toBe(200);
      for (const u of res.body.users) expect(u.phone ?? null).toBeNull();
    }
  });
  it("a company does not get student emails from the directory", async () => {
    const res = await get("/api/directory/users", "talent@northernsoft.local");
    for (const u of res.body.users.filter((x: { role: string }) => x.role === "STUDENT")) expect(u.email ?? null).toBeNull();
  });
  it("staff still get contact details", async () => {
    const res = await get("/api/directory/users", "staff@showpro.local");
    expect(res.body.users.some((u: { phone?: string }) => Boolean(u.phone))).toBe(true);
  });
});

describe("lecturers and companies lists", () => {
  it("a student does not receive advisees or phone numbers", async () => {
    const res = await get("/api/lecturers", "alice@student.showpro.local");
    const s = JSON.stringify(res.body);
    expect(s).not.toMatch(/"advisees"|"phone"|lastLogin/);
  });
  it("a student does not receive company login phones", async () => {
    const res = await get("/api/companies", "alice@student.showpro.local");
    expect(JSON.stringify(res.body)).not.toMatch(/"phone"|contactPersonPhone|lastLogin/);
  });
});
