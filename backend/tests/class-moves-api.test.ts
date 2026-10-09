import bcrypt from "bcryptjs";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const staff = () => as("staff@showpro.local");

// every test starts from a clean week: moves and weekly classes made by earlier tests would otherwise
// (correctly) count as busy rooms and lecturers
const createdCourseIds: string[] = [];
afterEach(async () => {
  await prisma.classMove.updateMany({ where: { status: { in: ["pending", "approved"] } }, data: { status: "cancelled" } });
  await prisma.course.updateMany({ where: { id: { in: createdCourseIds.splice(0) } }, data: { academicYear: "2500" } });
});

// each test's classes live in a term of their own, so they never clash with the seed's weekly classes
// (a lecturer may not teach two classes at once in one term — G4 รอง b)
let yr = "2569";
beforeEach(() => { yr = String(3000 + Math.floor(Math.random() * 60000)); });

const freshRoom = async () => prisma.facility.create({ data: { code: `R${uid()}`, name: "Room", building: "TEST", room: uid(), type: "classroom", capacity: 40 } });

/** a fresh lecturer-owned course in a term of its own with one section on Mondays 09:00–12:00 in a fresh room */
const freshClass = async (opts: { lecturer?: string; day?: string; start?: string; end?: string; facilityId?: string | null } = {}) => {
  const lecturer = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: opts.lecturer ?? "narin@showpro.local" } } });
  const room = opts.facilityId === null ? null : opts.facilityId ? { id: opts.facilityId } : await freshRoom();
  const code = `M${uid()}`;
  const course = await prisma.course.create({
    data: {
      code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: yr, year: 2, lecturerId: lecturer.id, status: "active",
      sections: { create: [{ number: "01", maxStudents: 30, facilityId: room?.id ?? null, room: room ? null : "Somewhere",
        schedule: [{ day: opts.day ?? "monday", startTime: opts.start ?? "09:00", endTime: opts.end ?? "12:00" }] }] },
    },
    include: { sections: true },
  });
  createdCourseIds.push(course.id);
  return { course, section: course.sections[0], roomId: room?.id ?? null };
};

const freshStudentIn = async (sectionIds: Array<{ courseId: string; sectionId: string }>) => {
  const email = uniqueEmail("mv");
  const user = await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `V${uid()}`, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569" } } },
    include: { studentProfile: true },
  });
  for (const s of sectionIds) await prisma.enrollment.create({ data: { studentId: user.studentProfile!.id, courseId: s.courseId, sectionId: s.sectionId } });
  return { userId: user.id, auth: await as(email) };
};

// 2030-09-16 is a Monday; the default target, Friday 2030-09-20 13:00, is free for narin and mali (DII340 Mon 09:00, DII420 Wed 13:00)
const move = (sectionId: string, over: Record<string, unknown> = {}) => ({
  sectionId, originalDate: "2030-09-16", originalStart: "09:00", newDate: "2030-09-20", newStart: "13:00", reason: "makeup", ...over,
});
const post = (auth: string, body: unknown) => request(app).post("/api/class-moves").set("Authorization", auth).send(body);

describe("creating moves", () => {
  it("staff moves are approved at once and tell the section's students and the lecturer", async () => {
    const { section, course } = await freshClass();
    const student = await freshStudentIn([{ courseId: course.id, sectionId: section.id }]);
    const res = await post(await staff(), move(section.id));
    expect(res.status).toBe(201);
    expect(res.body.move).toMatchObject({ status: "approved", originalDate: "2030-09-16", newDate: "2030-09-20", newStart: "13:00", newEnd: "16:00" });
    const narin = await prisma.user.findFirstOrThrow({ where: { email: "narin@showpro.local" } });
    for (const userId of [student.userId, narin.id]) {
      expect(await prisma.notification.count({ where: { userId, type: "class_move", message: { contains: course.code } } })).toBe(1);
    }
  });

  it("a lecturer's request on an own course is pending and staff are told; others are refused", async () => {
    const { section, course } = await freshClass();
    const res = await post(await as("narin@showpro.local"), move(section.id));
    expect(res.status).toBe(201);
    expect(res.body.move.status).toBe("pending");
    const staffUser = await prisma.user.findFirstOrThrow({ where: { email: "staff@showpro.local" } });
    expect(await prisma.notification.count({ where: { userId: staffUser.id, type: "class_move_request", message: { contains: course.code } } })).toBe(1);
    expect((await post(await as("mali@showpro.local"), move(section.id))).status).toBe(403);
    const student = await freshStudentIn([]);
    expect((await post(student.auth, move(section.id))).status).toBe(403);
  });

  it("the class must exist on that day and both days must be in the future", async () => {
    const { section } = await freshClass();
    const auth = await staff();
    expect((await post(auth, move(section.id, { originalDate: "2030-09-17" }))).status).toBe(400); // a Tuesday
    expect((await post(auth, move(section.id, { originalStart: "10:00" }))).status).toBe(400);
    expect((await post(auth, move(section.id, { originalDate: "2020-09-14" }))).status).toBe(400);
    expect((await post(auth, move(section.id, { newDate: "2020-09-16" }))).status).toBe(400);
    expect((await post(auth, move(section.id, { newStart: "23:00" }))).status).toBe(400); // would end after midnight
  });

  it("a section without a room must be given one", async () => {
    const { section } = await freshClass({ facilityId: null });
    const auth = await staff();
    expect((await post(auth, move(section.id))).status).toBe(400);
    const room = await freshRoom();
    expect((await post(auth, move(section.id, { facilityId: room.id }))).status).toBe(201);
  });
});

describe("clash checks", () => {
  it("room taken by a weekly class or a moved-in class blocks; a room freed by a move-out does not", async () => {
    const room = await freshRoom();
    const a = await freshClass({ facilityId: room.id, day: "friday", start: "13:00", end: "15:00" });
    const b = await freshClass({ lecturer: "mali@showpro.local" });
    const auth = await staff();
    const blocked = await post(auth, move(b.section.id, { facilityId: room.id }));
    expect(blocked.status).toBe(409);
    expect(JSON.stringify(blocked.body.details)).toContain(a.course.code);
    // move A's Friday class away; the room is now free that Friday
    expect((await post(auth, move(a.section.id, { originalDate: "2030-09-20", originalStart: "13:00", newDate: "2030-09-19", newStart: "08:00" }))).status).toBe(201);
    expect((await post(auth, move(b.section.id, { facilityId: room.id }))).status).toBe(201);
    // and a class moved into a room blocks it too
    const c = await freshClass({ lecturer: "mali@showpro.local" });
    expect((await post(auth, move(c.section.id, { facilityId: room.id, originalDate: "2030-09-23", newDate: "2030-09-19", newStart: "09:00" }))).status).toBe(409);
  });

  it("a class moved to another room frees its usual room", async () => {
    const r1 = await freshRoom();
    const r2 = await freshRoom();
    const a = await freshClass({ facilityId: r1.id, day: "friday", start: "13:00", end: "15:00" });
    const auth = await staff();
    // A's Friday class goes to Thursday 08:00 in another room, and A's next Friday stays at 13:00 but in the other room
    expect((await post(auth, move(a.section.id, { originalDate: "2030-09-20", originalStart: "13:00", newDate: "2030-09-19", newStart: "08:00", facilityId: r2.id }))).status).toBe(201);
    expect((await post(auth, move(a.section.id, { originalDate: "2030-09-27", originalStart: "13:00", newDate: "2030-09-27", newStart: "13:00", facilityId: r2.id }))).status).toBe(201);
    const b = await freshClass({ lecturer: "mali@showpro.local" });
    expect((await post(auth, move(b.section.id, { facilityId: r1.id, newDate: "2030-09-19", newStart: "08:00" }))).status).toBe(201);
    const c = await freshClass({ lecturer: "mali@showpro.local" });
    expect((await post(auth, move(c.section.id, { facilityId: r1.id, newDate: "2030-09-27", newStart: "13:00" }))).status).toBe(201);
  });

  it("two moves of different sections into the same room at once: one 201, one 409", async () => {
    const room = await freshRoom();
    const a = await freshClass();
    const b = await freshClass({ lecturer: "mali@showpro.local" });
    const auth = await staff();
    const results = await Promise.all([post(auth, move(a.section.id, { facilityId: room.id })), post(auth, move(b.section.id, { facilityId: room.id }))]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it("the lecturer being busy blocks; students being busy only warns", async () => {
    const auth = await staff();
    const own = await freshClass({ day: "friday", start: "13:00", end: "15:00" }); // narin's other class
    const target = await freshClass();
    expect((await post(auth, move(target.section.id))).status).toBe(409);
    expect((await post(auth, move(own.section.id, { originalDate: "2030-09-20", originalStart: "13:00", newDate: "2030-09-21", newStart: "08:00" }))).status).toBe(201);

    const other = await freshClass({ lecturer: "mali@showpro.local", day: "thursday", start: "13:00", end: "15:00" });
    await freshStudentIn([{ courseId: target.course.id, sectionId: target.section.id }, { courseId: other.course.id, sectionId: other.section.id }]);
    const res = await post(auth, move(target.section.id, { newDate: "2030-09-19" }));
    expect(res.status).toBe(201);
    expect(res.body.studentClashes).toEqual([{ courseCode: other.course.code, count: 1 }]);
  });

  it("check does not save anything", async () => {
    const { section } = await freshClass();
    const res = await request(app).post("/api/class-moves/check").set("Authorization", await staff()).send(move(section.id, { reason: undefined }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ roomClashes: [], lecturerClashes: [], studentClashes: [] });
    expect(await prisma.classMove.count({ where: { sectionId: section.id } })).toBe(0);
  });
});

describe("reading moves", () => {
  it("students see only approved moves of sections they take; companies are refused", async () => {
    const mine = await freshClass();
    const notMine = await freshClass({ lecturer: "mali@showpro.local" });
    const student = await freshStudentIn([{ courseId: mine.course.id, sectionId: mine.section.id }]);
    await post(await staff(), move(mine.section.id));
    await post(await staff(), move(notMine.section.id, { newStart: "08:00", newDate: "2030-09-21" }));
    await post(await as("narin@showpro.local"), move(mine.section.id, { originalDate: "2030-09-23", newDate: "2030-09-24" })); // pending
    const res = await request(app).get("/api/class-moves?from=2030-09-15&to=2030-09-30").set("Authorization", student.auth);
    expect(res.body.moves.map((m: { courseCode: string; status: string }) => [m.courseCode, m.status])).toEqual([[mine.course.code, "approved"]]);
    const company = await as("talent@northernsoft.local");
    expect((await request(app).get("/api/class-moves?from=2030-09-15&to=2030-09-30").set("Authorization", company)).status).toBe(403);
  });
});

describe("one active move per class and day", () => {
  it("two requests at once for the same class: one 201, one 409", async () => {
    const { section } = await freshClass();
    const lecturer = await as("narin@showpro.local");
    const results = await Promise.all([post(lecturer, move(section.id)), post(lecturer, move(section.id, { newStart: "08:00" }))]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });
});

const act = (auth: string, id: string, action: string, body: unknown = {}) =>
  request(app).post(`/api/class-moves/${id}/${action}`).set("Authorization", auth).send(body);

describe("deciding requests", () => {
  afterEach(() => vi.useRealTimers());

  it("staff approve a pending request; students and the lecturer are told", async () => {
    const { section, course } = await freshClass();
    const student = await freshStudentIn([{ courseId: course.id, sectionId: section.id }]);
    const created = await post(await as("narin@showpro.local"), move(section.id));
    const auth = await staff();
    expect((await request(app).get("/api/class-moves/pending").set("Authorization", auth)).body.moves.map((m: { id: string }) => m.id)).toContain(created.body.move.id);
    const res = await act(auth, created.body.move.id, "approve");
    expect(res.status).toBe(200);
    expect(res.body.move.status).toBe("approved");
    expect(await prisma.notification.count({ where: { userId: student.userId, type: "class_move", message: { contains: course.code } } })).toBe(1);
  });

  it("approval re-checks the room; a request whose room was taken stays pending", async () => {
    const room = await freshRoom();
    const a = await freshClass({ facilityId: room.id });
    const request1 = await post(await as("narin@showpro.local"), move(a.section.id));
    const b = await freshClass({ lecturer: "mali@showpro.local" });
    expect((await post(await staff(), move(b.section.id, { facilityId: room.id }))).status).toBe(201); // takes Fri 13:00 in that room
    const res = await act(await staff(), request1.body.move.id, "approve");
    expect(res.status).toBe(409);
    expect((await prisma.classMove.findUniqueOrThrow({ where: { id: request1.body.move.id } })).status).toBe("pending");
  });

  it("reject needs a note and tells the lecturer; withdraw only while pending", async () => {
    const { section, course } = await freshClass();
    const lecturer = await as("narin@showpro.local");
    const r1 = await post(lecturer, move(section.id));
    expect((await act(await staff(), r1.body.move.id, "reject", {})).status).toBe(400);
    expect((await act(await staff(), r1.body.move.id, "reject", { note: "no room" })).body.move.status).toBe("rejected");
    const narin = await prisma.user.findFirstOrThrow({ where: { email: "narin@showpro.local" } });
    expect(await prisma.notification.count({ where: { userId: narin.id, type: "class_move_decision", message: { contains: course.code } } })).toBe(1);

    const r2 = await post(lecturer, move(section.id));
    expect((await act(lecturer, r2.body.move.id, "withdraw")).body.move.status).toBe("withdrawn");
    const r3 = await post(lecturer, move(section.id));
    await act(await staff(), r3.body.move.id, "approve");
    expect((await act(lecturer, r3.body.move.id, "withdraw")).status).toBe(409);
    expect((await act(await as("mali@showpro.local"), r3.body.move.id, "withdraw")).status).toBe(403);
  });

  it("staff cancel before the day; not once the day has come", async () => {
    const { section } = await freshClass();
    const created = await post(await staff(), move(section.id));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-09-16T02:00:00.000Z")); // 09:00 Thai on the original day
    const auth = await staff();
    expect((await act(auth, created.body.move.id, "cancel")).status).toBe(409);
    vi.useRealTimers();
    const res = await act(await staff(), created.body.move.id, "cancel");
    expect(res.body.move.status).toBe("cancelled");
  });

  it("staff moving a class again cancels the old move; a waiting request blocks staff", async () => {
    const { section } = await freshClass();
    const auth = await staff();
    const first = await post(auth, move(section.id));
    const second = await post(auth, move(section.id, { newStart: "08:00" }));
    expect(second.status).toBe(201);
    expect((await prisma.classMove.findUniqueOrThrow({ where: { id: first.body.move.id } })).status).toBe("cancelled");
    const other = await freshClass();
    await post(await as("narin@showpro.local"), move(other.section.id));
    expect((await post(auth, move(other.section.id, { newStart: "08:00" }))).status).toBe(409);
  });
});

describe("weekly changes and pending moves", () => {
  it("a weekly change that drops a moved class is refused; other changes pass", async () => {
    const { section, course } = await freshClass();
    const created = await post(await staff(), move(section.id));
    const auth = await staff();
    const patch = (sections: unknown) => request(app).patch(`/api/courses/${course.id}`).set("Authorization", auth).send({ sections });
    const res = await patch([{ number: "01", maxStudents: 30, facilityId: section.facilityId, schedule: [{ day: "tuesday", startTime: "09:00", endTime: "12:00" }] }]);
    expect(res.status).toBe(409);
    expect(res.body.details[0].moveId).toBe(created.body.move.id);
    // the same class plus a new one is fine
    const ok = await patch([{ number: "01", maxStudents: 30, facilityId: section.facilityId, schedule: [
      { day: "monday", startTime: "09:00", endTime: "12:00" }, { day: "friday", startTime: "13:00", endTime: "14:00" },
    ] }]);
    expect(ok.status).toBe(200);
  });
});

describe("removing sections", () => {
  it("a section whose moves are all over or called off can be removed, and its move history goes with it", async () => {
    const { section, course } = await freshClass();
    const second = await prisma.section.create({ data: { courseId: course.id, number: "02", maxStudents: 30, room: "Somewhere", schedule: [{ day: "friday", startTime: "13:00", endTime: "14:00" }] } });
    const lecturer = await as("narin@showpro.local");
    const r = await post(lecturer, move(second.id, { originalDate: "2030-09-20", originalStart: "13:00", newDate: "2030-09-21", newStart: "08:00", facilityId: (await freshRoom()).id }));
    expect(r.status).toBe(201);
    await act(await staff(), r.body.move.id, "reject", { note: "no" });
    const res = await request(app).patch(`/api/courses/${course.id}`).set("Authorization", await staff())
      .send({ sections: [{ number: "01", maxStudents: 30, facilityId: section.facilityId, schedule: [{ day: "monday", startTime: "09:00", endTime: "12:00" }] }] });
    expect(res.status).toBe(200);
    expect(await prisma.classMove.count({ where: { id: r.body.move.id } })).toBe(0);
  });
});
