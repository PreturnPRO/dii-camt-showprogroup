import bcrypt from "bcryptjs";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

// owner decisions 9/10/69 (G4 รอง d, e): attendance is recorded only on a day the class meets (a class moved in
// counts, a class moved away does not); the low-attendance warning waits for 3 counted classes and means < 80 %

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
afterEach(() => vi.useRealTimers());

// 2026-09-28 is a Monday, 2026-09-29 a Tuesday, 2026-09-30 a Wednesday
const MON = "2026-09-28";
const TUE = "2026-09-29";
const WED = "2026-09-30";

/** a narin course (own term) with section 01 on Mondays 09:00–12:00, and a fresh student in that section */
const mondayClass = async (opts: { sections?: boolean } = {}) => {
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  const code = `D${uid()}`;
  const course = await prisma.course.create({
    data: {
      code, name: code, nameThai: code, credits: 3, semester: 1, academicYear: String(3000 + Math.floor(Math.random() * 60000)), year: 2,
      lecturerId: narin.id, status: "active",
      ...(opts.sections === false ? {} : { sections: { create: [
        { number: "01", maxStudents: 30, schedule: [{ day: "monday", startTime: "09:00", endTime: "12:00" }] },
        { number: "02", maxStudents: 30, schedule: [{ day: "thursday", startTime: "09:00", endTime: "12:00" }] },
      ] } }),
    },
    include: { sections: { orderBy: { number: "asc" } } },
  });
  const email = uniqueEmail("cd");
  const user = await prisma.user.create({
    data: {
      email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `C${uid()}`, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569" } },
    },
    include: { studentProfile: true },
  });
  const enrollment = await prisma.enrollment.create({ data: { studentId: user.studentProfile!.id, courseId: course.id, sectionId: course.sections[0]?.id ?? null } });
  return { course, enrollment, userId: user.id, narinUserId: narin.userId, auth: await as("narin@showpro.local") };
};

const mark = (auth: string, body: Record<string, unknown>) => request(app).post("/api/attendance/check-in").set("Authorization", auth).send(body);

describe("attendance only on a class day", () => {
  it("a day the student's section meets is fine; another day is refused and says when the class meets", async () => {
    const c = await mondayClass();
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: MON, status: "present" })).status).toBe(201);
    const tue = await mark(c.auth, { enrollmentId: c.enrollment.id, date: TUE, status: "absent" });
    expect(tue.status).toBe(409);
    expect(tue.body.details).toMatchObject({ code: "NO_CLASS_THAT_DAY" });
    // Thursday is section 02's day, not this student's
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: "2026-10-01", status: "absent" })).status).toBe(409);
  });

  it("a class moved to another day counts there and not on its old day", async () => {
    const c = await mondayClass();
    await prisma.classMove.create({ data: {
      sectionId: c.course.sections[0].id, originalDate: new Date(`${MON}T00:00:00Z`), originalStart: "09:00", originalEnd: "12:00",
      newDate: new Date(`${WED}T00:00:00Z`), newStart: "13:00", newEnd: "16:00", status: "approved", reason: "test", requestedById: c.narinUserId,
    } });
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: WED, status: "present" })).status).toBe(201);
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: MON, status: "present" })).status).toBe(409);
    // a move that is only pending changes nothing
    const other = await mondayClass();
    await prisma.classMove.create({ data: {
      sectionId: other.course.sections[0].id, originalDate: new Date(`${MON}T00:00:00Z`), originalStart: "09:00", originalEnd: "12:00",
      newDate: new Date(`${WED}T00:00:00Z`), newStart: "13:00", newEnd: "16:00", status: "pending", reason: "test", requestedById: other.narinUserId,
    } });
    expect((await mark(other.auth, { enrollmentId: other.enrollment.id, date: MON, status: "present" })).status).toBe(201);
    expect((await mark(other.auth, { enrollmentId: other.enrollment.id, date: WED, status: "present" })).status).toBe(409);
  });

  it("a student with no section counts any section's day", async () => {
    const c = await mondayClass();
    await prisma.enrollment.update({ where: { id: c.enrollment.id }, data: { sectionId: null } });
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: "2026-10-01", status: "present" })).status).toBe(201);
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: TUE, status: "present" })).status).toBe(409);
  });

  it("a QR session cannot start on a day the course does not meet", async () => {
    const c = await mondayClass();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${TUE}T03:00:00Z`)); // 10:00 Thai, Tuesday
    expect((await request(app).post("/api/attendance/sessions").set("Authorization", c.auth).send({ courseId: c.course.id })).status).toBe(409);
    vi.setSystemTime(new Date(`${MON}T03:00:00Z`)); // Monday
    expect((await request(app).post("/api/attendance/sessions").set("Authorization", c.auth).send({ courseId: c.course.id })).status).toBe(201);
  });

  it("a record already kept for a day can still be corrected after the timetable changes (review M3)", async () => {
    const c = await mondayClass();
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: MON, status: "absent" })).status).toBe(201);
    await prisma.section.update({ where: { id: c.course.sections[0].id }, data: { schedule: [{ day: "tuesday", startTime: "09:00", endTime: "12:00" }] } });
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: MON, status: "leave" })).status).toBe(201);
    // a new Monday record is still refused
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: "2026-09-21", status: "absent" })).status).toBe(409);
  });

  it("a course with no timetable yet cannot tell its days, so it is not blocked", async () => {
    const c = await mondayClass({ sections: false });
    expect((await mark(c.auth, { enrollmentId: c.enrollment.id, date: TUE, status: "present" })).status).toBe(201);
  });
});

describe("the low-attendance warning", () => {
  const warnings = (userId: string) => prisma.notification.count({ where: { userId, type: "ATTENDANCE_WARNING" } });
  const settle = () => new Promise((r) => setTimeout(r, 300));
  // three Mondays
  const days = ["2026-09-14", "2026-09-21", MON];

  it("one absence out of one class is not a warning yet", async () => {
    const c = await mondayClass();
    await mark(c.auth, { enrollmentId: c.enrollment.id, date: days[0], status: "absent" });
    await settle();
    expect(await warnings(c.userId)).toBe(0);
  });

  it("after three counted classes below 80 % the student is warned", async () => {
    const c = await mondayClass();
    await mark(c.auth, { enrollmentId: c.enrollment.id, date: days[0], status: "present" });
    await mark(c.auth, { enrollmentId: c.enrollment.id, date: days[1], status: "absent" });
    await settle();
    expect(await warnings(c.userId)).toBe(0);
    await mark(c.auth, { enrollmentId: c.enrollment.id, date: days[2], status: "absent" });
    await vi.waitFor(async () => expect(await warnings(c.userId)).toBe(1));
  });
});
