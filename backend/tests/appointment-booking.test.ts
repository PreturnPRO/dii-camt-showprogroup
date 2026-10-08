import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { thaiDay } from "../src/services/attendance";
import { freshIntern, freshLecturer } from "./helpers/internship";

// M1 (Por 8/10/69): students book a free office-hour slot of the lecturer; the server enforces it
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
/** the next date (Bangkok calendar, at least `minDays` ahead) that falls on `day` */
const nextDate = (day: string, minDays = 1) => {
  const today = thaiDay(new Date());
  for (let i = minDays; i < minDays + 8; i += 1) {
    const d = new Date(today.getTime() + i * 86400000);
    if (DAYS[d.getUTCDay()] === day) return d.toISOString().slice(0, 10);
  }
  throw new Error("unreachable");
};

const setup = async () => {
  const lecturer = await freshLecturer([{ day: "tuesday", startTime: "13:00", endTime: "13:30", location: "CAMT 301" }]);
  const student = await freshIntern();
  const book = (body: Record<string, unknown>, auth = student.auth) =>
    request(app).post("/api/appointments").set("Authorization", auth)
      .send({ lecturerId: lecturer.profile.id, date: nextDate("tuesday"), startTime: "13:00", endTime: "13:30", purpose: "Project advice", ...body });
  return { lecturer, student, book };
};

describe("booking an appointment", () => {
  it("books a free office-hour slot; the place comes from the slot, not the request", async () => {
    const { book } = await setup();
    const res = await book({ location: "somewhere else" });
    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({ status: "pending", location: "CAMT 301", startTime: "13:00" });
  });

  it("refuses a time that is not one of the lecturer's office-hour slots", async () => {
    const { book } = await setup();
    expect((await book({ startTime: "14:00", endTime: "14:30" })).status).toBe(400);
    expect((await book({ date: nextDate("wednesday") })).status).toBe(400);
  });

  it("refuses a date in the past and an unknown lecturer", async () => {
    const { book } = await setup();
    expect((await book({ date: "2026-01-06" })).status).toBe(400);
    expect((await book({ lecturerId: "nobody" })).status).toBe(404);
  });

  it("gives one slot to one student, even when two book it at the same moment", async () => {
    const { lecturer, book } = await setup();
    const other = await freshIntern();
    const [a, b] = await Promise.all([book({}), book({}, other.auth)]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.appointment.count({ where: { lecturerId: lecturer.profile.id } })).toBe(1);
  });

  it("frees the slot again once the appointment is cancelled", async () => {
    const { lecturer, book } = await setup();
    const first = await book({});
    await prisma.appointment.update({ where: { id: first.body.appointment.id }, data: { status: "cancelled" } });
    const other = await freshIntern();
    expect((await book({}, other.auth)).status).toBe(201);
    expect(await prisma.appointment.count({ where: { lecturerId: lecturer.profile.id, status: "pending" } })).toBe(1);
  });
});

describe("office hours", () => {
  it("a lecturer replaces their own weekly office hours; times must make sense", async () => {
    const lecturer = await freshLecturer();
    const ok = await request(app).put("/api/office-hours").set("Authorization", lecturer.auth)
      .send({ officeHours: [{ day: "monday", startTime: "09:00", endTime: "09:30", location: "CAMT 205" }] });
    expect(ok.status).toBe(200);
    expect(ok.body.officeHours).toHaveLength(1);
    for (const bad of [
      { day: "funday", startTime: "09:00", endTime: "09:30", location: "x" },
      { day: "monday", startTime: "10:00", endTime: "09:30", location: "x" },
      { day: "monday", startTime: "9am", endTime: "09:30", location: "x" },
    ]) {
      expect((await request(app).put("/api/office-hours").set("Authorization", lecturer.auth).send({ officeHours: [bad] })).status).toBe(400);
    }
  });
});

describe("a lecturer's office hours as others see them", () => {
  it("list the slots, never the lecturer's appointments", async () => {
    const lecturer = await freshLecturer([{ day: "tuesday", startTime: "13:00", endTime: "13:30", location: "CAMT 301" }]);
    const student = await freshIntern();
    await request(app).post("/api/appointments").set("Authorization", student.auth)
      .send({ lecturerId: lecturer.profile.id, date: nextDate("tuesday"), startTime: "13:00", endTime: "13:30", purpose: "Private matter" }).expect(201);
    const other = await freshIntern();
    const res = await request(app).get(`/api/office-hours/${lecturer.profile.id}`).set("Authorization", other.auth);
    expect(res.status).toBe(200);
    expect(res.body.officeHours).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toContain("Private matter");
  });
});

describe("one lecturer, never two bookings at the same time", () => {
  it("a slot changed to overlap an existing booking cannot be booked again", async () => {
    const { lecturer, book } = await setup();
    expect((await book({})).status).toBe(201);
    await request(app).put("/api/office-hours").set("Authorization", lecturer.auth)
      .send({ officeHours: [{ day: "tuesday", startTime: "13:15", endTime: "13:45", location: "CAMT 301" }] }).expect(200);
    const other = await freshIntern();
    expect((await book({ startTime: "13:15", endTime: "13:45" }, other.auth)).status).toBe(409);
    const day = await request(app).get(`/api/office-hours/${lecturer.profile.id}?date=${nextDate("tuesday")}`).set("Authorization", other.auth);
    expect(day.body.slots[0].isBooked).toBe(true);
  });

  it("office hours that overlap or repeat on the same day are refused", async () => {
    const lecturer = await freshLecturer();
    for (const officeHours of [
      [{ day: "monday", startTime: "09:00", endTime: "10:00", location: "A" }, { day: "monday", startTime: "09:30", endTime: "10:30", location: "A" }],
      [{ day: "monday", startTime: "09:00", endTime: "09:30", location: "A" }, { day: "monday", startTime: "09:00", endTime: "09:30", location: "B" }],
    ]) {
      expect((await request(app).put("/api/office-hours").set("Authorization", lecturer.auth).send({ officeHours })).status).toBe(400);
    }
    const sameTimeOtherDay = [{ day: "monday", startTime: "09:00", endTime: "09:30", location: "A" }, { day: "friday", startTime: "09:00", endTime: "09:30", location: "A" }];
    expect((await request(app).put("/api/office-hours").set("Authorization", lecturer.auth).send({ officeHours: sameTimeOtherDay })).status).toBe(200);
  });

  it("a date that does not exist is refused, not rolled over to another day", async () => {
    const { book } = await setup();
    expect((await book({ date: "2027-02-30" })).status).toBe(400);
  });

  it("a cancelled booking cannot be brought back, and only real statuses are accepted", async () => {
    const { lecturer, book } = await setup();
    const first = await book({});
    const id = first.body.appointment.id;
    const setStatus = (status: string) => request(app).patch(`/api/appointments/${id}/status`).set("Authorization", lecturer.auth).send({ status });
    expect((await setStatus("foo")).status).toBe(400);
    expect((await setStatus("cancelled")).status).toBe(200);
    expect((await setStatus("confirmed")).status).toBe(409);
    expect((await setStatus("completed")).status).toBe(409);
  });

  it("pending can be confirmed, and confirmed completed", async () => {
    const { lecturer, book } = await setup();
    const id = (await book({})).body.appointment.id;
    const setStatus = (status: string) => request(app).patch(`/api/appointments/${id}/status`).set("Authorization", lecturer.auth).send({ status });
    expect((await setStatus("completed")).status).toBe(409);
    expect((await setStatus("confirmed")).status).toBe(200);
    expect((await setStatus("completed")).status).toBe(200);
  });

  it("an appointment shows who is involved, not their phone or account details", async () => {
    const { student, book } = await setup();
    await book({});
    const list = await request(app).get("/api/appointments").set("Authorization", student.auth);
    const appointment = list.body.appointments[0];
    for (const person of [appointment.lecturer.user, appointment.student.user]) {
      expect(person.phone).toBeUndefined();
      expect(person.lastLogin).toBeUndefined();
      expect(person.nameThai).toBeTruthy();
    }
  });
});
