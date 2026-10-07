import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { uniqueEmail } from "./helpers/auth";

// accounts are created only by staff/admin (add user or import) — anyone could otherwise claim any student ID
describe("POST /api/auth/register", () => {
  it.each(["STUDENT", "STAFF", "LECTURER", "COMPANY", "ADMIN"])("is gone for %s and creates nothing", async (role) => {
    const email = uniqueEmail(role.toLowerCase());
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email,
        password: "Password123!",
        name: "New",
        nameThai: "ใหม่",
        role,
        profile: { studentId: `S${Date.now()}`, major: "DII", program: "bachelor", year: 1, semester: 1, academicYear: "2569" },
      });
    expect(res.status).toBe(404);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });
});
