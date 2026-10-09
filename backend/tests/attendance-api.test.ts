import bcrypt from "bcryptjs";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { thaiDay } from "../src/services/attendance";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const freshStudent = async () => {
  const email = uniqueEmail("att");
  const user = await prisma.user.create({
    data: {
      email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `A${uid()}`, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569" } },
    },
    include: { studentProfile: true },
  });
  return { profile: user.studentProfile!, userId: user.id, auth: await as(email) };
};

/** a narin course with one fresh student enrolled */
const narinClass = async () => {
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  const code = `A${uid()}`;
  const course = await prisma.course.create({ data: { code, name: code, nameThai: code, credits: 3, semester: 1, academicYear: "2569", year: 2, lecturerId: narin.id, status: "active" } });
  const s = await freshStudent();
  const enrollment = await prisma.enrollment.create({ data: { studentId: s.profile.id, courseId: course.id } });
  return { course, s, enrollment, narin: await as("narin@showpro.local") };
};

const mark = (auth: string, body: Record<string, unknown>) => request(app).post("/api/attendance/check-in").set("Authorization", auth).send(body);
const startQr = async (auth: string, courseId: string) =>
  (await request(app).post("/api/attendance/sessions").set("Authorization", auth).send({ courseId })).body.session.token as string;
const scan = (auth: string, token: string) => request(app).post("/api/attendance/sessions/check-in").set("Authorization", auth).send({ token });

afterEach(() => vi.useRealTimers());

describe("manual check-in", () => {
  it("stores the Thai calendar day and only known statuses", async () => {
    const { enrollment, narin } = await narinClass();
    const res = await mark(narin, { enrollmentId: enrollment.id, date: "2026-10-01T23:30:00.000Z", status: "late" }); // 06:30 Thai on 2 Oct
    expect(res.status).toBe(201);
    expect(new Date(res.body.attendance.date).toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect((await mark(narin, { enrollmentId: enrollment.id, date: "2026-10-02", status: "here" })).status).toBe(400);
  });

  it("refuses future days and dropped enrollments", async () => {
    const { enrollment, narin } = await narinClass();
    const tomorrow = new Date(thaiDay(new Date()).getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    expect((await mark(narin, { enrollmentId: enrollment.id, date: tomorrow, status: "leave" })).status).toBe(400);
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: "dropped" } });
    expect((await mark(narin, { enrollmentId: enrollment.id, date: "2026-10-01", status: "present" })).status).toBe(409);
  });
});

describe("QR check-in", () => {
  it("records today's Thai day", async () => {
    const { course, s, narin } = await narinClass();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T23:30:00.000Z")); // 06:30 Thai, 7 Oct
    const res = await scan(s.auth, await startQr(narin, course.id));
    expect(res.status).toBe(200);
    expect(new Date(res.body.attendance.date).toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });

  it("never overwrites what the lecturer recorded, and refuses dropped students", async () => {
    const { course, s, enrollment, narin } = await narinClass();
    await prisma.attendanceRecord.create({ data: { enrollmentId: enrollment.id, date: thaiDay(new Date()), status: "absent" } });
    const res = await scan(s.auth, await startQr(narin, course.id));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/lecturer/);
    expect((await prisma.attendanceRecord.findFirstOrThrow({ where: { enrollmentId: enrollment.id } })).status).toBe("absent");

    const other = await narinClass();
    await prisma.enrollment.update({ where: { id: other.enrollment.id }, data: { status: "dropped" } });
    expect((await scan(other.s.auth, await startQr(other.narin, other.course.id))).status).toBe(403);
  });

  it("two scans at once: one 200, one 409", async () => {
    const { course, s, narin } = await narinClass();
    const token = await startQr(narin, course.id);
    const results = await Promise.all([scan(s.auth, token), scan(s.auth, token)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });
});

describe("summary and warnings", () => {
  it("leave is outside the denominator, unmarked days are not absences, dropped students are left out", async () => {
    const { course, s, enrollment, narin } = await narinClass();
    const bob = await freshStudent();
    const bobEnrollment = await prisma.enrollment.create({ data: { studentId: bob.profile.id, courseId: course.id } });
    const gone = await freshStudent();
    const goneEnrollment = await prisma.enrollment.create({ data: { studentId: gone.profile.id, courseId: course.id, status: "dropped" } });
    const d = (day: string) => new Date(`2026-09-${day}`);
    await prisma.attendanceRecord.createMany({ data: [
      { enrollmentId: enrollment.id, date: d("01"), status: "present" },
      { enrollmentId: enrollment.id, date: d("02"), status: "late" },
      { enrollmentId: enrollment.id, date: d("03"), status: "absent" },
      { enrollmentId: enrollment.id, date: d("04"), status: "leave" },
      { enrollmentId: bobEnrollment.id, date: d("01"), status: "leave" },
      { enrollmentId: goneEnrollment.id, date: d("05"), status: "present" },
    ] });
    const res = await request(app).get(`/api/attendance/summary/${course.id}`).set("Authorization", narin);
    expect(res.body.totalSessions).toBe(4);
    const rows = Object.fromEntries(res.body.summary.map((r: { studentId: string }) => [r.studentId, r]));
    expect(rows[s.profile.id]).toMatchObject({ present: 1, late: 1, absent: 1, leave: 1, unmarked: 0, percentage: 66.7 });
    expect(rows[bob.profile.id]).toMatchObject({ leave: 1, unmarked: 3, percentage: null });
    expect(rows[gone.profile.id]).toBeUndefined();
  });

  it("warns per course: a warning for one course does not silence another", async () => {
    const a = await narinClass();
    const narinProfile = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
    const code2 = `A${uid()}`;
    const course2 = await prisma.course.create({ data: { code: code2, name: code2, nameThai: code2, credits: 3, semester: 1, academicYear: "2569", year: 2, lecturerId: narinProfile.id, status: "active" } });
    const e2 = await prisma.enrollment.create({ data: { studentId: a.s.profile.id, courseId: course2.id } });
    // a warning needs 3 counted classes (owner decision 9/10/69)
    for (const date of ["2026-09-01", "2026-09-02", "2026-09-03"]) {
      await mark(a.narin, { enrollmentId: a.enrollment.id, date, status: "absent" });
      await mark(a.narin, { enrollmentId: e2.id, date, status: "absent" });
    }
    await vi.waitFor(async () => {
      const titles = (await prisma.notification.findMany({ where: { userId: a.s.userId, type: "ATTENDANCE_WARNING" } })).map((n) => n.title).sort();
      expect(titles).toEqual([`Low Attendance Warning: ${a.course.code}`, `Low Attendance Warning: ${code2}`].sort());
    });
  });

  it("a student with only leave is not warned", async () => {
    const a = await narinClass();
    await mark(a.narin, { enrollmentId: a.enrollment.id, date: "2026-09-01", status: "leave" });
    await new Promise((r) => setTimeout(r, 300));
    expect(await prisma.notification.count({ where: { userId: a.s.userId, type: "ATTENDANCE_WARNING" } })).toBe(0);
  });
});
