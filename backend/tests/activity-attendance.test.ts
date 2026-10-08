import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authOf, freshIntern } from "./helpers/internship";

// M8 (Por 8/10/69): staff tick who came; "came" grants the activity's hours and points once, "absent" grants nothing
const registered = async () => {
  const activity = await prisma.activity.create({ data: {
    title: `Attendance ${Date.now()}`, titleThai: "กิจกรรมเช็คชื่อ", description: "d", type: "workshop",
    startDate: new Date(Date.now() - 3600_000), endDate: new Date(), location: "CAMT", organizer: "DII",
    activityHours: 3, gamificationPoints: 10, status: "ongoing",
  } });
  const student = await freshIntern();
  const enrollment = await prisma.activityEnrollment.create({ data: { activityId: activity.id, studentId: student.profile.id } });
  return { activity, student, enrollment };
};
const mark = async (id: string, status: string, email = "staff@showpro.local") =>
  request(app).patch(`/api/activities/enrollments/${id}/status`).set("Authorization", await authOf(email)).send({ status });
const totals = async (studentId: string) =>
  prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId }, select: { totalActivityHours: true, gamificationPoints: true } });

describe("staff confirm who attended an activity", () => {
  it("'came' grants the hours and points exactly once, even when clicked twice at the same time", async () => {
    const { student, enrollment } = await registered();
    const before = await totals(student.profile.id);
    const [a, b] = await Promise.all([mark(enrollment.id, "completed"), mark(enrollment.id, "completed")]);
    expect([a.status, b.status].sort()).toEqual([200, 200]);
    expect((await mark(enrollment.id, "completed")).status).toBe(200);
    const after = await totals(student.profile.id);
    expect(after.totalActivityHours - before.totalActivityHours).toBe(3);
    expect(after.gamificationPoints - before.gamificationPoints).toBe(10);
    expect(await prisma.timelineEvent.count({ where: { studentId: student.profile.id, type: "activity" } })).toBe(1);
  });

  it("'absent' grants nothing and can be undone back to registered", async () => {
    const { student, enrollment } = await registered();
    const before = await totals(student.profile.id);
    expect((await mark(enrollment.id, "absent")).status).toBe(200);
    expect(await totals(student.profile.id)).toEqual(before);
    expect((await prisma.activityEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).status).toBe("absent");
    expect((await mark(enrollment.id, "registered")).status).toBe(200);
  });

  it("once the reward is granted the attendance cannot be switched to absent", async () => {
    const { enrollment } = await registered();
    await mark(enrollment.id, "completed");
    const res = await mark(enrollment.id, "absent");
    expect(res.status).toBe(409);
    expect((await prisma.activityEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).status).toBe("completed");
  });

  it("refuses an unknown status and anyone who does not manage the activity", async () => {
    const { enrollment } = await registered();
    expect((await mark(enrollment.id, "attended-maybe")).status).toBe(400);
    expect((await mark(enrollment.id, "completed", "alice@student.showpro.local")).status).toBe(403);
  });
});

describe("what attendance can be credited", () => {
  const activityWith = async (data: { status?: string; startDate?: Date }) => {
    const activity = await prisma.activity.create({ data: {
      title: `Guard ${Date.now()}`, titleThai: "กิจกรรมทดสอบ", description: "d", type: "workshop",
      startDate: data.startDate ?? new Date(Date.now() - 3600_000), endDate: new Date(Date.now() + 86400_000), location: "CAMT", organizer: "DII",
      activityHours: 3, gamificationPoints: 10, status: data.status ?? "ongoing",
    } });
    const student = await freshIntern();
    const enrollment = await prisma.activityEnrollment.create({ data: { activityId: activity.id, studentId: student.profile.id } });
    return { student, enrollment };
  };

  it("nothing for a cancelled activity, one that has not started, or one not yet approved", async () => {
    for (const data of [{ status: "cancelled" }, { startDate: new Date(Date.now() + 86400_000), status: "upcoming" }, { status: "pending" }]) {
      const { student, enrollment } = await activityWith(data);
      const before = await totals(student.profile.id);
      expect((await mark(enrollment.id, "completed")).status).toBe(409);
      expect(await totals(student.profile.id)).toEqual(before);
    }
  });

  it("a lecturer who does not run the activity cannot mark it", async () => {
    const { enrollment } = await activityWith({});
    expect((await mark(enrollment.id, "completed", "mali@showpro.local")).status).toBe(403);
  });
});
