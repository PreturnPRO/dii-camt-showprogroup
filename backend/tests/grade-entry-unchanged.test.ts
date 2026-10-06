import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("saving the whole grade sheet", () => {
  it("rows that did not change produce no history, timeline, notification or gradedAt", async () => {
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
    const course = await prisma.course.create({
      data: { code: `U${Math.random().toString(36).slice(2, 8).toUpperCase()}`, name: "Unchanged", nameThai: "เหมือนเดิม", credits: 3, semester: 1, academicYear: bob.academicYear, year: 1, lecturerId: narin.id, status: "active" },
    });
    const enrollment = await prisma.enrollment.create({ data: { studentId: bob.id, courseId: course.id } });
    const counts = async () => ({
      history: await prisma.gradeHistory.count({ where: { enrollmentId: enrollment.id } }),
      timeline: await prisma.timelineEvent.count({ where: { studentId: bob.id, relatedId: course.id, type: "grade" } }),
      notifications: await prisma.notification.count({ where: { userId: bob.userId, type: "grade" } }),
    });
    const before = await counts();
    // what the lecturer sheet sends for an ungraded student it did not touch
    const res = await request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`)
      .send({ grades: [{ enrollmentId: enrollment.id, studentId: bob.id, courseId: course.id, scores: [], reason: "Lecturer grade update" }] });
    expect(res.status).toBe(200);
    expect(await counts()).toEqual(before);
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).gradedAt).toBeNull();
  });
});
