import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authOf, freshIntern } from "./helpers/internship";

// G6 (security M2): enrolling again must not rewrite a mark staff gave; a cancelled or finished activity takes no one
const openActivity = (status = "upcoming") => prisma.activity.create({ data: {
  title: `Enroll ${Date.now()}`, titleThai: "กิจกรรมลงทะเบียน", description: "d", type: "workshop",
  startDate: new Date(Date.now() + 86400_000), endDate: new Date(Date.now() + 2 * 86400_000), location: "CAMT", organizer: "DII",
  activityHours: 3, gamificationPoints: 10, status, registrationStatus: "open",
} });
const enroll = (activityId: string, auth: string) => request(app).post(`/api/activities/enroll/${activityId}`).set("Authorization", auth);

describe("enrolling in an activity", () => {
  it("enrolling twice is refused and keeps the mark staff gave", async () => {
    const activity = await openActivity();
    const student = await freshIntern();
    expect((await enroll(activity.id, student.auth)).status).toBe(201);
    await prisma.activityEnrollment.update({ where: { activityId_studentId: { activityId: activity.id, studentId: student.profile.id } }, data: { status: "absent" } });
    const again = await enroll(activity.id, student.auth);
    expect(again.status).toBe(409);
    expect(again.body.details).toMatchObject({ code: "ALREADY_ENROLLED" });
    expect((await prisma.activityEnrollment.findUniqueOrThrow({ where: { activityId_studentId: { activityId: activity.id, studentId: student.profile.id } } })).status).toBe("absent");
  });

  it("a cancelled or completed activity takes no one", async () => {
    const student = await freshIntern();
    for (const status of ["cancelled", "completed"]) {
      const res = await enroll((await openActivity(status)).id, student.auth);
      expect(res.status).toBe(409);
      expect(res.body.details).toMatchObject({ code: "ACTIVITY_CLOSED" });
    }
  });

  it("the last seat goes to one of two students enrolling at once", async () => {
    const activity = await prisma.activity.update({ where: { id: (await openActivity()).id }, data: { maxParticipants: 1 } });
    const [a, b] = await Promise.all([enroll(activity.id, (await freshIntern()).auth), enroll(activity.id, (await freshIntern()).auth)]);
    expect([a.status, b.status].sort()).toEqual([201, 400]);
  });
});
