import { describe, expect, it } from "vitest";
import { computeGpa, termGpas } from "../src/services/gpa";

const row = (letterGrade: string | null, credits = 3, extra: Partial<{ status: string; semester: number; academicYear: string }> = {}) => ({
  letterGrade, credits, status: "enrolled", semester: 1, academicYear: "2569", ...extra,
});

describe("computeGpa", () => {
  it("weights by credits over counted grades only", () => {
    expect(computeGpa([row("A", 3), row("C", 1)])).toEqual({ gpa: 3.5, credits: 4, earnedCredits: 4 });
  });
  it("ignores ungraded, W, I and dropped rows; F counts in GPA but earns no credit", () => {
    expect(computeGpa([row("B"), row(null), row("W"), row("I"), row("A", 3, { status: "dropped" }), row("F")])).toEqual({ gpa: 1.5, credits: 6, earnedCredits: 3 });
  });
  it("is null when nothing counts", () => {
    expect(computeGpa([row(null), row("W")]).gpa).toBeNull();
  });
});

describe("termGpas", () => {
  it("one entry per term with counted grades, oldest first", () => {
    const rows = [row("A", 3, { semester: 1, academicYear: "2569" }), row("B", 3, { semester: 2, academicYear: "2568" }), row(null, 3, { semester: 2, academicYear: "2569" })];
    expect(termGpas(rows)).toEqual([
      { semester: 2, academicYear: "2568", gpa: 3, credits: 3 },
      { semester: 1, academicYear: "2569", gpa: 4, credits: 3 },
    ]);
  });
});

import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("student GPA/GPAX after grading", () => {
  it("a W does not drag GPAX down, and GPA is the student's current term only", async () => {
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
    // an A in an older term, so GPAX (all terms) and GPA (current term) must differ
    const older = await prisma.course.create({
      data: { code: `OLD${Date.now()}`.slice(0, 10), name: "Old", nameThai: "เก่า", credits: 3, semester: 2, academicYear: String(Number(bob.academicYear) - 1), year: 2, lecturerId: narin.id, status: "active" },
    });
    await prisma.enrollment.create({ data: { studentId: bob.id, courseId: older.id, letterGrade: "A", total: 90 } });
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });

    const res = await request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`)
      .send({ grades: [{ studentId: bob.id, courseId: dii340.id, letterGrade: "W" }] });
    expect(res.status).toBeLessThan(300);

    const after = await prisma.studentProfile.findUniqueOrThrow({ where: { id: bob.id } });
    // only the older A counts: W is excluded instead of counting as 0 points
    expect(after.gpax).toBe(4);
    // DII340 (the current term course) now has W only → no counted grade this term
    expect(after.gpa).toBe(0);
  });
});
