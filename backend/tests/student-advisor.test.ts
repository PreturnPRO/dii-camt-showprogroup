import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authOf, freshIntern } from "./helpers/internship";

// H2 (Por 8/10/69): staff/admin give any student an advisor, in the edit dialog or the import file
const narinProfile = () => prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
const maliProfile = () => prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "mali@showpro.local" } } });

describe("setting a student's advisor from the Users page", () => {
  it("staff set, change and clear it; the lecturer then sees (or stops seeing) the advisee", async () => {
    const student = await freshIntern();
    const mali = await maliProfile();
    const staff = await authOf("staff@showpro.local");
    const edit = (advisorId: string | null) =>
      request(app).patch(`/api/users/${student.userId}`).set("Authorization", staff).send({ roleData: { advisorId } });

    expect((await edit(mali.id)).status).toBe(200);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { id: student.profile.id } })).advisorId).toBe(mali.id);
    const advisees = await request(app).get("/api/courses/lecturer/schedule").set("Authorization", await authOf("mali@showpro.local"));
    expect(JSON.stringify(advisees.body)).toContain(student.profile.studentId);

    expect((await edit(null)).status).toBe(200);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { id: student.profile.id } })).advisorId).toBeNull();
  });

  it("an edit that does not mention the advisor leaves it alone", async () => {
    const student = await freshIntern();
    const narin = await narinProfile();
    await request(app).patch(`/api/users/${student.userId}`).set("Authorization", await authOf("staff@showpro.local")).send({ roleData: { year: 4 } }).expect(200);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { id: student.profile.id } })).advisorId).toBe(narin.id);
  });

  it("refuses something that is not a lecturer, with a 400 rather than a crash", async () => {
    const student = await freshIntern();
    const staff = await authOf("staff@showpro.local");
    for (const advisorId of ["not-a-lecturer", ""]) {
      const res = await request(app).patch(`/api/users/${student.userId}`).set("Authorization", staff).send({ roleData: { advisorId } });
      expect(res.status).toBe(400);
    }
  });
});

describe("importing students with an advisor", () => {
  const row = (extra: Record<string, unknown>) => {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return { studentId: `68${stamp.slice(-7)}`, name: "Import Advisor", email: `adv-${stamp}@example.com`, major: "DII", program: "DII", year: 1, semester: 1, academicYear: "2569", ...extra };
  };

  it("links the advisor named by email; leaving the column out keeps the student without one", async () => {
    const staff = await authOf("staff@showpro.local");
    const withAdvisor = row({ advisorEmail: "MALI@showpro.local" });
    const without = row({});
    const res = await request(app).post("/api/users/import/students").set("Authorization", staff).send({ rows: [withAdvisor, without] });
    expect(res.status).toBe(201);
    expect(res.body.createdCount).toBe(2);
    const mali = await maliProfile();
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { studentId: withAdvisor.studentId } })).advisorId).toBe(mali.id);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { studentId: without.studentId } })).advisorId).toBeNull();
  });

  it("fails just that row when the advisor email is not a lecturer", async () => {
    const staff = await authOf("staff@showpro.local");
    const bad = row({ advisorEmail: "alice@student.showpro.local" });
    const res = await request(app).post("/api/users/import/students").set("Authorization", staff).send({ rows: [bad] });
    expect(res.body.failedCount).toBe(1);
    expect(res.body.results[0].message).toMatch(/advisor/i);
    expect(await prisma.studentProfile.findUnique({ where: { studentId: bad.studentId } })).toBeNull();
  });
});

describe("creating a student with an advisor", () => {
  it("keeps the advisor chosen in the create form", async () => {
    const mali = await maliProfile();
    const stamp = `${Date.now()}`;
    const res = await request(app).post("/api/users").set("Authorization", await authOf("staff@showpro.local")).send({
      name: "New With Advisor", nameThai: "ใหม่ มีที่ปรึกษา", email: `new-adv-${stamp}@example.com`, role: "STUDENT",
      profile: { studentId: `69${stamp.slice(-7)}`, major: "DII", program: "bachelor", year: 1, semester: 1, academicYear: "2569", advisorId: mali.id },
    });
    expect(res.status).toBe(201);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { studentId: `69${stamp.slice(-7)}` } })).advisorId).toBe(mali.id);
  });
});

describe("a bad advisor value in an import file", () => {
  it("fails only its own row, even when it is not an email at all", async () => {
    const stamp = `${Date.now()}`;
    const good = { studentId: `61${stamp.slice(-7)}`, name: "Good", email: `good-${stamp}@example.com`, major: "DII", program: "DII", year: 1, semester: 1, academicYear: "2569" };
    const bad = { ...good, studentId: `62${stamp.slice(-7)}`, email: `bad-${stamp}@example.com`, advisorEmail: "อ.มะลิ" };
    const res = await request(app).post("/api/users/import/students").set("Authorization", await authOf("staff@showpro.local")).send({ rows: [good, bad] });
    expect(res.status).toBe(201);
    expect(res.body.createdCount).toBe(1);
    expect(res.body.failedCount).toBe(1);
  });
});
