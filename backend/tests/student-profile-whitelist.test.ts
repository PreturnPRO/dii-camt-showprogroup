import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const patch = async (email: string, body: Record<string, unknown>) =>
  request(app).patch("/api/students/profile").set("Authorization", `Bearer ${await loginAs(email)}`).send(body);

describe("student editing their own profile", () => {
  it("cannot change student code, advisor, status, year, major, program, term or academic year", async () => {
    const before = await prisma.studentProfile.findFirstOrThrow({ where: { studentId: "65010001" } });
    const mali = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "mali@showpro.local" } } });
    const res = await patch("alice@student.showpro.local", {
      studentId: "99999999", advisorId: mali.id, academicStatus: "honors", year: 4, major: "X", program: "X", semester: 3, academicYear: "1999",
      cvUrl: "https://cv.example.com/a.pdf",
    });
    expect(res.status).toBe(200);
    const after = await prisma.studentProfile.findUniqueOrThrow({ where: { id: before.id } });
    for (const key of ["studentId", "advisorId", "academicStatus", "year", "major", "program", "semester", "academicYear"] as const) {
      expect(after[key]).toEqual(before[key]);
    }
    expect(after.cvUrl).toBe("https://cv.example.com/a.pdf");
  });

  it("cannot verify their own skills, and keeps an existing verification when re-saving", async () => {
    const alice = await prisma.studentProfile.findFirstOrThrow({ where: { studentId: "65010001" } });
    const skill = await prisma.skill.upsert({ where: { name: "S-b2 Verified Skill" }, update: {}, create: { name: "S-b2 Verified Skill", category: "programming" } });
    await prisma.studentSkill.upsert({
      where: { studentId_skillId: { studentId: alice.id, skillId: skill.id } },
      update: { verifiedBy: "Dr. Narin" },
      create: { studentId: alice.id, skillId: skill.id, level: "intermediate", verifiedBy: "Dr. Narin" },
    });
    const current = await prisma.studentSkill.findMany({ where: { studentId: alice.id }, include: { skill: true } });
    const skills = [
      ...current.map((s) => ({ name: s.skill.name, category: s.skill.category, level: s.level, verifiedBy: s.skill.name === skill.name ? "Myself" : undefined })),
      { name: "S-b2 Self Claimed", category: "programming", level: "advanced", verifiedBy: "Dr. Fake" },
    ];
    expect((await patch("alice@student.showpro.local", { skills })).status).toBe(200);
    const after = await prisma.studentSkill.findMany({ where: { studentId: alice.id }, include: { skill: true } });
    expect(after.find((s) => s.skill.name === "S-b2 Verified Skill")?.verifiedBy).toBe("Dr. Narin");
    expect(after.find((s) => s.skill.name === "S-b2 Self Claimed")?.verifiedBy ?? null).toBeNull();
  });

  it("cannot rewrite the category of a skill shared by everyone", async () => {
    const shared = await prisma.skill.upsert({ where: { name: "S-b2 Shared Skill" }, update: { category: "programming" }, create: { name: "S-b2 Shared Skill", category: "programming" } });
    await patch("alice@student.showpro.local", { skills: [{ name: "S-b2 Shared Skill", category: "cooking", level: "beginner" }] });
    expect((await prisma.skill.findUniqueOrThrow({ where: { id: shared.id } })).category).toBe("programming");
  });
});

describe("admin editing a student", () => {
  it("selects the student by profile id without overwriting the student code (audit: code became the cuid)", async () => {
    const target = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const res = await patch("admin@showpro.local", { studentId: target.id, year: 4 });
    expect(res.status).toBe(200);
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    expect(bob.studentId).toBe("65010002");
    expect(bob.year).toBe(4);
  });

  it("can only assign an advisor that is a real lecturer profile", async () => {
    expect((await patch("admin@showpro.local", { studentId: "65010002", advisorId: "not-a-lecturer" })).status).toBe(400);
    const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
    expect((await patch("admin@showpro.local", { studentId: "65010002", advisorId: narin.id })).status).toBe(200);
  });
});
