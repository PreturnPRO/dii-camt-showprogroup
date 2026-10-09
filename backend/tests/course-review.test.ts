import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authOf } from "./helpers/internship";

// owner decisions 9/10/69 (G4 รอง): a lecturer's new course waits in a queue staff are told about;
// staff approve it or send it back with a reason, and the lecturer fixes and sends it again.
// A lecturer may not teach two classes at once in one term (active or waiting courses), and a room
// is busy only for courses of the same term.

let staff: string;
let narinAuth: string;
let maliAuth: string;
let narinId: string;
let narinUserId: string;

beforeAll(async () => {
  staff = await authOf("staff@showpro.local");
  narinAuth = await authOf("narin@showpro.local");
  maliAuth = await authOf("mali@showpro.local");
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  narinId = narin.id;
  narinUserId = narin.userId;
});

const code = () => `R${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
/** a term nobody else uses, so clashes come only from this test's own courses */
const term = () => ({ semester: 1, academicYear: String(2600 + Math.floor(Math.random() * 8000)) });
const slot = (day: string, startTime: string, endTime: string) => ({ day, startTime, endTime });

const create = (body: Record<string, unknown>, auth = staff) =>
  request(app).post("/api/courses").set("Authorization", auth).send({
    code: code(), name: "Review", nameThai: "ทดสอบอนุมัติ", credits: 3, year: 2, lecturerId: narinId, status: "active",
    sections: [{ number: "01", maxStudents: 10, schedule: [] }], ...term(), ...body,
  });

const staffNotes = (courseCode: string) =>
  prisma.notification.count({ where: { user: { email: "staff@showpro.local" }, OR: [{ message: { contains: courseCode } }, { messageThai: { contains: courseCode } }] } });
const narinNotes = (courseCode: string) =>
  prisma.notification.count({ where: { userId: narinUserId, OR: [{ message: { contains: courseCode } }, { messageThai: { contains: courseCode } }] } });

describe("the course approval queue", () => {
  it("a lecturer's new course waits for approval and staff are told", async () => {
    const res = await create({}, narinAuth);
    expect(res.status).toBe(201);
    expect(res.body.course.status).toBe("pending");
    expect(await staffNotes(res.body.course.code)).toBe(1);
  });

  it("staff send a course back with a reason; the lecturer is told; no reason is refused", async () => {
    const course = (await create({}, narinAuth)).body.course;
    const review = (body: object, auth = staff) => request(app).post(`/api/courses/${course.id}/review`).set("Authorization", auth).send(body);
    expect((await review({ decision: "reject" })).status).toBe(400);
    expect((await review({ decision: "reject", reason: "ขอแก้ช่วงเวลา" }, narinAuth)).status).toBe(403);
    const res = await review({ decision: "reject", reason: "ขอแก้ช่วงเวลา" });
    expect(res.status).toBe(200);
    const after = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(after.status).toBe("rejected");
    expect(after.reviewNote).toBe("ขอแก้ช่วงเวลา");
    expect(await narinNotes(course.code)).toBe(1);
    // only a waiting course can be reviewed
    expect((await review({ decision: "approve" })).status).toBe(409);
  });

  it("the lecturer sends a returned course again: it waits again, the note clears, staff are told again", async () => {
    const course = (await create({}, narinAuth)).body.course;
    await request(app).post(`/api/courses/${course.id}/review`).set("Authorization", staff).send({ decision: "reject", reason: "แก้ชื่อวิชา" });
    expect((await request(app).post(`/api/courses/${course.id}/submit`).set("Authorization", maliAuth)).status).toBe(403);
    const res = await request(app).post(`/api/courses/${course.id}/submit`).set("Authorization", narinAuth);
    expect(res.status).toBe(200);
    const after = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(after.status).toBe("pending");
    expect(after.reviewNote).toBeNull();
    expect(await staffNotes(course.code)).toBe(2);
    expect((await request(app).post(`/api/courses/${course.id}/submit`).set("Authorization", narinAuth)).status).toBe(409);
  });

  it("staff approve: the course opens and the lecturer is told", async () => {
    const course = (await create({}, narinAuth)).body.course;
    const res = await request(app).post(`/api/courses/${course.id}/review`).set("Authorization", staff).send({ decision: "approve" });
    expect(res.status).toBe(200);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).status).toBe("active");
    expect(await narinNotes(course.code)).toBe(1);
  });

  it("staff can list the waiting courses", async () => {
    const course = (await create({}, narinAuth)).body.course;
    const res = await request(app).get("/api/courses?status=pending").set("Authorization", staff);
    expect(res.status).toBe(200);
    expect(res.body.courses.every((c: { status: string }) => c.status === "pending")).toBe(true);
    expect(res.body.courses.some((c: { id: string }) => c.id === course.id)).toBe(true);
  });
});

describe("a lecturer cannot teach two classes at once", () => {
  it("a second course at an overlapping time in the same term is refused and names the clash", async () => {
    const t = term();
    const first = await create({ ...t, sections: [{ number: "01", maxStudents: 10, schedule: [slot("monday", "09:00", "12:00")] }] });
    expect(first.status).toBe(201);
    const second = await create({ ...t, sections: [{ number: "01", maxStudents: 10, schedule: [slot("monday", "11:00", "13:00")] }] });
    expect(second.status).toBe(409);
    expect(second.body.message).toContain(first.body.course.code);
    // touching (12:00 end, 12:00 start) is not a clash; another term is not a clash
    expect((await create({ ...t, sections: [{ number: "01", maxStudents: 10, schedule: [slot("monday", "12:00", "13:00")] }] })).status).toBe(201);
    expect((await create({ semester: 2, academicYear: t.academicYear, sections: [{ number: "01", maxStudents: 10, schedule: [slot("monday", "09:00", "12:00")] }] })).status).toBe(201);
  });

  it("a waiting course counts; an archived or returned one does not", async () => {
    const t = term();
    const at = [{ number: "01", maxStudents: 10, schedule: [slot("tuesday", "13:00", "16:00")] }];
    const waiting = await create({ ...t, sections: at }, narinAuth);
    expect(waiting.status).toBe(201);
    expect((await create({ ...t, sections: at })).status).toBe(409);
    await request(app).post(`/api/courses/${waiting.body.course.id}/review`).set("Authorization", staff).send({ decision: "reject", reason: "ย้ายวัน" });
    expect((await create({ ...t, sections: at })).status).toBe(201);
    // the returned one cannot come back into the clash
    expect((await request(app).post(`/api/courses/${waiting.body.course.id}/submit`).set("Authorization", narinAuth)).status).toBe(409);
  });

  it("two sections of one course at the same time with the same lecturer are refused", async () => {
    const res = await create({ sections: [
      { number: "01", maxStudents: 10, schedule: [slot("wednesday", "09:00", "10:00")] },
      { number: "02", maxStudents: 10, schedule: [slot("wednesday", "09:30", "10:30")] },
    ] });
    expect(res.status).toBe(409);
  });

  it("editing a course into a clash is refused", async () => {
    const t = term();
    await create({ ...t, sections: [{ number: "01", maxStudents: 10, schedule: [slot("thursday", "09:00", "12:00")] }] });
    const other = (await create({ ...t, sections: [{ number: "01", maxStudents: 10, schedule: [slot("friday", "09:00", "12:00")] }] })).body.course;
    const res = await request(app).patch(`/api/courses/${other.id}`).set("Authorization", staff).send({
      sections: [{ number: "01", maxStudents: 10, schedule: [slot("thursday", "10:00", "11:00")] }],
    });
    expect(res.status).toBe(409);
  });
});

describe("an overlap already in the data", () => {
  it("does not block an edit that leaves time and lecturer alone, but does block moving the course", async () => {
    const t = term();
    const at = [{ day: "sunday", startTime: "09:00", endTime: "12:00" }];
    const make = (c: string) => prisma.course.create({ data: {
      code: c, name: c, nameThai: c, credits: 3, year: 2, lecturerId: narinId, status: "active", ...t,
      sections: { create: [{ number: "01", maxStudents: 10, schedule: at }] },
    } });
    await make(code());
    const second = await make(code());
    expect((await request(app).patch(`/api/courses/${second.id}`).set("Authorization", staff).send({ description: "แก้คำอธิบาย" })).status).toBe(200);
    expect((await request(app).patch(`/api/courses/${second.id}`).set("Authorization", staff).send({
      sections: [{ number: "01", maxStudents: 10, schedule: [{ day: "sunday", startTime: "10:00", endTime: "12:00" }] }],
    })).status).toBe(409);
  });
});

describe("review findings", () => {
  it("M1: resending the same sections (as the staff editor does) with a text edit is not a clash check", async () => {
    const t = term();
    const at = [{ number: "01", maxStudents: 10, schedule: [{ day: "sunday", startTime: "13:00", endTime: "15:00" }] }];
    const make = (c: string) => prisma.course.create({ data: {
      code: c, name: c, nameThai: c, credits: 3, year: 2, lecturerId: narinId, status: "active", ...t, sections: { create: at },
    } });
    await make(code());
    const second = await make(code());
    expect((await request(app).patch(`/api/courses/${second.id}`).set("Authorization", staff).send({ description: "พิมพ์ผิด", sections: at })).status).toBe(200);
  });

  it("M2: the editor cannot move a course into or out of the queue; review and submit do that", async () => {
    const course = (await create({}, narinAuth)).body.course;
    const patch = (status: string) => request(app).patch(`/api/courses/${course.id}`).set("Authorization", staff).send({ status });
    expect((await patch("active")).status).toBe(409);
    await request(app).post(`/api/courses/${course.id}/review`).set("Authorization", staff).send({ decision: "reject", reason: "x" });
    expect((await patch("pending")).status).toBe(409);
    // other moves are still the editor's: archive a returned course
    expect((await patch("archived")).status).toBe(200);
  });

  it("M4: a lecturer's edit of a returned course is checked under the lock when sent again", async () => {
    const t = term();
    const at = (day: string) => [{ number: "01", maxStudents: 10, schedule: [{ day, startTime: "09:00", endTime: "10:00" }] }];
    await create({ ...t, sections: at("friday") });
    const mine = (await create({ ...t, sections: at("thursday") }, narinAuth)).body.course;
    await request(app).post(`/api/courses/${mine.id}/review`).set("Authorization", staff).send({ decision: "reject", reason: "x" });
    // a returned course is not checked when edited, only when sent again
    expect((await request(app).patch(`/api/courses/${mine.id}`).set("Authorization", narinAuth).send({ sections: at("friday") })).status).toBe(200);
    expect((await request(app).post(`/api/courses/${mine.id}/submit`).set("Authorization", narinAuth)).status).toBe(409);
  });

  it("L8: a course cannot be created with a made-up or queue-only status", async () => {
    expect((await create({ status: "whatever" })).status).toBe(400);
    expect((await create({ status: "rejected" })).status).toBe(400);
  });
});

describe("two saves at once", () => {
  it("two clashing courses created together: exactly one gets in", async () => {
    const t = term();
    const at = [{ number: "01", maxStudents: 10, schedule: [slot("saturday", "13:00", "15:00")] }];
    const results = await Promise.all([create({ ...t, sections: at }), create({ ...t, sections: at }), create({ ...t, sections: at })]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
  });
});

describe("a room is busy only within its own term", () => {
  it("the same room at the same time in another term is free", async () => {
    const t = term();
    const room = `ROOM-${code()}`;
    const at = (lecturerId: string) => ({ lecturerId, sections: [{ number: "01", room, maxStudents: 10, schedule: [slot("monday", "09:00", "12:00")] }] });
    const mali = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "mali@showpro.local" } } });
    expect((await create({ ...t, ...at(narinId) })).status).toBe(201);
    expect((await create({ ...t, ...at(mali.id) })).status).toBe(409);
    expect((await create({ semester: 2, academicYear: t.academicYear, ...at(mali.id) })).status).toBe(201);
  });
});
