import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;

describe("student self check-in is closed until a check-in method is chosen", () => {
  it("returns 403 and grants nothing", async () => {
    const workshop = await prisma.activity.findFirstOrThrow({ where: { title: "Career Portfolio Workshop" } });
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const res = await request(app).post(`/api/activities/check-in/${workshop.id}`).set("Authorization", await as("bob@student.showpro.local"));
    expect(res.status).toBe(403);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { id: bob.id } })).gamificationPoints).toBe(bob.gamificationPoints);
  });
});

describe("leaderboard consent", () => {
  it("hides a student who opted out from other students, but not from themselves", async () => {
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    await prisma.dataConsent.update({ where: { studentId: bob.id }, data: { showInLeaderboard: false } });
    try {
      const seenByAlice = await request(app).get("/api/activities").set("Authorization", await as("alice@student.showpro.local"));
      const text = JSON.stringify(seenByAlice.body);
      expect(text).not.toMatch(/Bob|บ๊อบ/);
      expect(text).not.toMatch(/showInLeaderboard|"consent"/);
      const anonymous = seenByAlice.body.activities
        .flatMap((a: { enrollments: Array<{ student: { user: unknown } }> }) => a.enrollments)
        .filter((e: { student: { user: unknown } }) => e.student.user === null);
      expect(anonymous.length).toBeGreaterThan(0);

      const seenByBob = await request(app).get("/api/activities").set("Authorization", await as("bob@student.showpro.local"));
      expect(JSON.stringify(seenByBob.body)).toMatch(/Bob|บ๊อบ/);
    } finally {
      await prisma.dataConsent.update({ where: { studentId: bob.id }, data: { showInLeaderboard: true } });
    }
  });
});

describe("activity reward timeline", () => {
  it("records the student's own term and academic year, not a hard-coded term 1 / Gregorian year", async () => {
    const staff = await as("staff@showpro.local");
    const created = await request(app).post("/api/activities").set("Authorization", staff).send({
      title: "Timeline check", titleThai: "ทดสอบไทม์ไลน์", description: "d", type: "workshop",
      // already held: attendance is only credited once an activity has started
      startDate: "2026-10-01T09:00:00.000Z", endDate: "2026-10-01T12:00:00.000Z",
      location: "CAMT", organizer: "DII", activityHours: 1, gamificationPoints: 1, status: "completed",
    });
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const enrollment = await prisma.activityEnrollment.create({ data: { activityId: created.body.activity.id, studentId: bob.id } });
    expect((await request(app).patch(`/api/activities/enrollments/${enrollment.id}/status`).set("Authorization", staff).send({ status: "completed" })).status).toBe(200);
    const event = await prisma.timelineEvent.findFirstOrThrow({ where: { relatedId: created.body.activity.id, studentId: bob.id } });
    expect(event.semester).toBe(bob.semester);
    expect(event.academicYear).toBe(bob.academicYear);
  });
});

describe("an opted-out student cannot be re-identified", () => {
  it("other students get no stable id for them, only an anonymous row that still counts", async () => {
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    await prisma.dataConsent.update({ where: { studentId: bob.id }, data: { showInLeaderboard: false } });
    try {
      const res = await request(app).get("/api/activities").set("Authorization", await as("alice@student.showpro.local"));
      expect(JSON.stringify(res.body)).not.toContain(bob.id);
      const hackathon = res.body.activities.find((a: { title: string }) => a.title === "ShowPro Hackathon");
      expect(hackathon.enrollments).toHaveLength(2);
    } finally {
      await prisma.dataConsent.update({ where: { studentId: bob.id }, data: { showInLeaderboard: true } });
    }
  });
});
