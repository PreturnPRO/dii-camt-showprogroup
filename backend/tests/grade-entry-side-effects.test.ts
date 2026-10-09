import request from "supertest";
import { describe, expect, it, vi } from "vitest";

// make every in-app notification fail, to prove grades + GPA stay consistent anyway
vi.mock("../src/services/notification.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/notification.service")>();
  return { ...actual, createNotification: vi.fn(async () => { throw new Error("notification service down"); }) };
});

const { app } = await import("../src/app");
const { prisma } = await import("../src/lib/prisma");
const { loginAs } = await import("./helpers/auth");

// a published course, so the change goes straight to the student and the notification is attempted
describe("grading when a side effect fails", () => {
  it("the save still succeeds and GPAX is recalculated", async () => {
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
    const course = await prisma.course.create({
      data: { code: `S${Math.random().toString(36).slice(2, 8).toUpperCase()}`, name: "Side", nameThai: "ข้าง", credits: 3, semester: 2, academicYear: String(Number(bob.academicYear) - 2), year: 1, lecturerId: narin.id, status: "active", gradesPublishedAt: new Date() },
    });
    await prisma.enrollment.create({ data: { studentId: bob.id, courseId: course.id } });
    const res = await request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`)
      .send({ grades: [{ studentId: bob.id, courseId: course.id, letterGrade: "A" }] });
    expect(res.status).toBe(200);
    const rows = await prisma.enrollment.findMany({ where: { studentId: bob.id, status: { not: "dropped" } }, include: { course: true } });
    const counted = rows.filter((r) => r.letterGrade && !["W", "I"].includes(r.letterGrade));
    expect(counted.some((r) => r.courseId === course.id)).toBe(true);
    const after = await prisma.studentProfile.findUniqueOrThrow({ where: { id: bob.id } });
    expect(after.gpax).toBeGreaterThan(0);
  });
});
