import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { uniqueEmail } from "./helpers/auth";

const studentBody = (email: string, studentId: string) => ({
  email,
  password: "Password123!",
  name: "New Student",
  nameThai: "นักศึกษาใหม่",
  role: "STUDENT",
  profile: { studentId, major: "DII", program: "bachelor", year: 1, semester: 1, academicYear: "2569" },
});

describe("POST /api/auth/register", () => {
  it("creates a STUDENT", async () => {
    const email = uniqueEmail("stu");
    const res = await request(app).post("/api/auth/register").send(studentBody(email, `S${Date.now()}`));
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("STUDENT");
  });

  it.each(["STAFF", "LECTURER", "COMPANY", "ADMIN"])("rejects self-registration as %s", async (role) => {
    const email = uniqueEmail(role.toLowerCase());
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...studentBody(email, `X${Date.now()}`), role, profile: { staffId: "X1", lecturerId: "L1", companyId: "C1", department: "x", position: "x", companyName: "x" } });
    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("does not let a new student pick their own advisor", async () => {
    const lecturer = await prisma.lecturerProfile.findFirstOrThrow();
    const email = uniqueEmail("adv");
    const body = studentBody(email, `A${Date.now()}`);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...body, profile: { ...body.profile, advisorId: lecturer.id } });
    expect(res.status).toBe(201);
    const created = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email } } });
    expect(created.advisorId).toBeNull();
  });
});
