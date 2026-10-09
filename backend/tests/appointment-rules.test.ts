import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { thaiDay } from "../src/services/attendance";
import { authOf, freshIntern, freshLecturer } from "./helpers/internship";

// owner decisions 9/10/69 (G6): one upcoming booking per lecturer, at most 30 days ahead; a student cancels
// their own booking until it starts; the lecturer (only) confirms, completes after it started, or cancels;
// staff and admin see the list only
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const dateOn = (day: string, minDays: number) => {
  const today = thaiDay(new Date());
  for (let i = minDays; i < minDays + 8; i += 1) {
    const d = new Date(today.getTime() + i * 86400000);
    if (DAYS[d.getUTCDay()] === day) return d.toISOString().slice(0, 10);
  }
  throw new Error("unreachable");
};

const setup = async () => {
  const lecturer = await freshLecturer([
    { day: "tuesday", startTime: "13:00", endTime: "13:30", location: "CAMT 301" },
    { day: "tuesday", startTime: "14:00", endTime: "14:30", location: "CAMT 301" },
  ]);
  const student = await freshIntern();
  const book = (body: Record<string, unknown> = {}, auth = student.auth) =>
    request(app).post("/api/appointments").set("Authorization", auth)
      .send({ lecturerId: lecturer.profile.id, date: dateOn("tuesday", 1), startTime: "13:00", endTime: "13:30", purpose: "Advice", ...body });
  const setStatus = (id: string, status: string, auth = lecturer.auth) =>
    request(app).patch(`/api/appointments/${id}/status`).set("Authorization", auth).send({ status });
  return { lecturer, student, book, setStatus };
};

describe("booking limits", () => {
  it("one upcoming booking per lecturer: a second one is refused until the first is over or cancelled", async () => {
    const { book, setStatus } = await setup();
    const first = await book();
    expect(first.status).toBe(201);
    const second = await book({ startTime: "14:00", endTime: "14:30" });
    expect(second.status).toBe(409);
    expect(second.body.details).toMatchObject({ code: "ONE_PER_LECTURER" });
    await setStatus(first.body.appointment.id, "cancelled");
    expect((await book({ startTime: "14:00", endTime: "14:30" })).status).toBe(201);
  });

  it("no further than 30 days ahead", async () => {
    const { book } = await setup();
    const far = await book({ date: dateOn("tuesday", 31) });
    expect(far.status).toBe(400);
    expect(far.body.details).toMatchObject({ code: "TOO_FAR" });
    expect((await book({ date: "9999-12-28" })).status).toBe(400);
  });

  it("two bookings at once by the same student with the same lecturer: one gets in", async () => {
    const { book } = await setup();
    const [a, b] = await Promise.all([book(), book({ startTime: "14:00", endTime: "14:30" })]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });
});

describe("cancelling and closing", () => {
  it("a student cancels their own booking before it starts; the lecturer is told; not someone else's", async () => {
    const { book, setStatus, lecturer } = await setup();
    const id = (await book()).body.appointment.id;
    const other = await freshIntern();
    expect((await setStatus(id, "cancelled", other.auth)).status).toBe(403);
    const before = await prisma.notification.count({ where: { userId: lecturer.userId } });
    expect((await setStatus(id, "cancelled", await authFor(id))).status).toBe(200);
    expect(await prisma.notification.count({ where: { userId: lecturer.userId } })).toBe(before + 1);
  });

  it("a student cannot confirm or complete, and cannot cancel once it started", async () => {
    const { book } = await setup();
    const id = (await book()).body.appointment.id;
    const auth = await authFor(id);
    expect((await request(app).patch(`/api/appointments/${id}/status`).set("Authorization", auth).send({ status: "confirmed" })).status).toBe(403);
    await prisma.appointment.update({ where: { id }, data: { date: thaiDay(new Date(Date.now() - 2 * 86400000)) } });
    expect((await request(app).patch(`/api/appointments/${id}/status`).set("Authorization", auth).send({ status: "cancelled" })).status).toBe(409);
  });

  it("the lecturer completes a meeting only once it has started", async () => {
    const { book, setStatus } = await setup();
    const id = (await book()).body.appointment.id;
    expect((await setStatus(id, "confirmed")).status).toBe(200);
    const early = await setStatus(id, "completed");
    expect(early.status).toBe(409);
    expect(early.body.details).toMatchObject({ code: "NOT_STARTED" });
    await prisma.appointment.update({ where: { id }, data: { date: thaiDay(new Date(Date.now() - 86400000)) } });
    expect((await setStatus(id, "completed")).status).toBe(200);
  });

  it("staff and admin see the list only", async () => {
    const { book } = await setup();
    const id = (await book()).body.appointment.id;
    for (const email of ["staff@showpro.local", "admin@showpro.local"]) {
      const auth = await authOf(email);
      expect((await request(app).patch(`/api/appointments/${id}/status`).set("Authorization", auth).send({ status: "cancelled" })).status).toBe(403);
      expect((await request(app).get("/api/appointments").set("Authorization", auth)).status).toBe(200);
    }
  });

  it("confirm and cancel at the same moment: exactly one wins", async () => {
    const { book, setStatus } = await setup();
    const id = (await book()).body.appointment.id;
    const [a, b] = await Promise.all([setStatus(id, "confirmed"), setStatus(id, "cancelled")]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it("the student's notice names the new status in Thai, not a code", async () => {
    const { book, setStatus, student } = await setup();
    const id = (await book()).body.appointment.id;
    await setStatus(id, "confirmed");
    const notice = await prisma.notification.findFirstOrThrow({ where: { userId: student.userId, type: "appointment" }, orderBy: { createdAt: "desc" } });
    expect(notice.messageThai).toContain("ยืนยันแล้ว");
    expect(notice.messageThai).not.toContain("confirmed");
  });
});

describe("review findings (G6)", () => {
  it("L2: a student cancelling cannot write the lecturer's meeting notes", async () => {
    const { book } = await setup();
    const id = (await book()).body.appointment.id;
    await request(app).patch(`/api/appointments/${id}/status`).set("Authorization", await authFor(id)).send({ status: "cancelled", meetingNotes: "x", followUp: "y" });
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id } });
    expect(after.meetingNotes).toBeNull();
    expect(after.followUp).toBeNull();
  });

  it("L5: a waiting booking whose time has passed cannot be confirmed (it can be cancelled)", async () => {
    const { book, setStatus } = await setup();
    const id = (await book()).body.appointment.id;
    await prisma.appointment.update({ where: { id }, data: { date: thaiDay(new Date(Date.now() - 86400000)) } });
    const res = await setStatus(id, "confirmed");
    expect(res.status).toBe(409);
    expect(res.body.details).toMatchObject({ code: "STARTED" });
    expect((await setStatus(id, "cancelled")).status).toBe(200);
  });
});

describe("office hours", () => {
  it("a date that does not exist is a 400, not a 500", async () => {
    const { lecturer } = await setup();
    const staff = await authOf("staff@showpro.local");
    for (const date of ["2026-02-30", "2026-13-01", "2026-00-10", "2026-01-00"]) {
      expect((await request(app).get(`/api/office-hours/${lecturer.profile.id}?date=${date}`).set("Authorization", staff)).status).toBe(400);
    }
  });
});

/** the booking student's own token */
async function authFor(appointmentId: string) {
  const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: { student: { include: { user: true } } } });
  return authOf(appt.student.user.email);
}
