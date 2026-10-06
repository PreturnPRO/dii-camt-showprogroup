import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;

/** a fresh ungraded course bob is enrolled in, owned by narin, in bob's current term */
const ungradedCourseForBob = async () => {
  const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  const code = `T${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  const course = await prisma.course.create({
    data: { code, name: code, nameThai: code, credits: 3, semester: bob.semester, academicYear: bob.academicYear, year: 3, lecturerId: narin.id, status: "active",
      gradingCriteria: { create: [{ name: "Work", weightPercentage: 100, maxScore: 100, orderIndex: 0 }] } },
    include: { gradingCriteria: true },
  });
  const enrollment = await prisma.enrollment.create({ data: { studentId: bob.id, courseId: course.id } });
  return { bob, course, enrollment };
};

describe("dropping", () => {
  it("a graded course cannot be dropped", async () => {
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    const res = await request(app).delete(`/api/enrollments/course/${dii340.id}`).set("Authorization", await as("alice@student.showpro.local"));
    expect(res.status).toBe(409);
    expect((await prisma.enrollment.findFirstOrThrow({ where: { courseId: dii340.id, student: { user: { email: "alice@student.showpro.local" } } } })).status).not.toBe("dropped");
  });

  it("re-enrolling after dropping an ungraded course starts clean", async () => {
    const { course, enrollment } = await ungradedCourseForBob();
    await prisma.enrollmentScore.create({ data: { enrollmentId: enrollment.id, criteriaId: course.gradingCriteria[0].id, score: 55 } });
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { total: 55 } });
    const auth = await as("bob@student.showpro.local");
    expect((await request(app).delete(`/api/enrollments/course/${course.id}`).set("Authorization", auth)).status).toBe(200);
    expect((await request(app).post("/api/enrollments").set("Authorization", auth).send({ courseId: course.id })).status).toBeLessThan(300);
    const again = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(again.status).toBe("enrolled");
    expect(again.total).toBeNull();
    expect(again.letterGrade).toBeNull();
    expect(await prisma.enrollmentScore.count({ where: { enrollmentId: enrollment.id } })).toBe(0);
  });
});

describe("transcript and stats", () => {
  it("dropped enrollments are not on the transcript or in grade history", async () => {
    const { course } = await ungradedCourseForBob();
    const auth = await as("bob@student.showpro.local");
    expect((await request(app).delete(`/api/enrollments/course/${course.id}`).set("Authorization", auth)).status).toBe(200);
    const transcript = await request(app).get("/api/student/transcript").set("Authorization", auth);
    const stats = await request(app).get("/api/students/stats").set("Authorization", auth);
    expect(JSON.stringify(transcript.body)).not.toContain(course.code);
    expect(JSON.stringify(stats.body.stats.gradeHistory)).not.toContain(course.code);
  });

  it("stats return term GPAs oldest first and the current term GPA", async () => {
    const res = await request(app).get("/api/students/stats").set("Authorization", await as("alice@student.showpro.local"));
    const terms = res.body.stats.termGpa as Array<{ semester: number; academicYear: string; gpa: number }>;
    expect(terms.length).toBeGreaterThan(0); // alice has graded courses in the seed
    const keys = terms.map((t) => Number(t.academicYear) * 10 + t.semester);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    expect("currentTermGpa" in res.body.stats).toBe(true);
  });

  it("transcript rows carry per-criterion scores", async () => {
    const res = await request(app).get("/api/student/transcript").set("Authorization", await as("alice@student.showpro.local"));
    expect(res.body.transcript.length).toBeGreaterThan(0);
    expect(res.body.transcript.every((r: { scores?: unknown }) => Array.isArray(r.scores))).toBe(true);
  });
});
