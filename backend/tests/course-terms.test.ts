import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authOf, freshIntern } from "./helpers/internship";

// owner decisions 9/10/69 (G4): a course code is unique per term, not forever; a lecturer may not change
// the credits, sections, times or rooms of an active course (staff do); delete removes a course nobody ever
// enrolled in, and archives one with a history

let staff: string;
let narinAuth: string;
let narinId: string;

beforeAll(async () => {
  staff = await authOf("staff@showpro.local");
  narinAuth = await authOf("narin@showpro.local");
  narinId = (await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } })).id;
});

const code = () => `T${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
const section = (number: string) => ({ number, maxStudents: 10, schedule: [{ day: "saturday", startTime: "08:00", endTime: "09:00" }] });

const createCourse = (body: Record<string, unknown>, auth = staff) =>
  request(app).post("/api/courses").set("Authorization", auth).send({
    name: "Term", nameThai: "เทอม", credits: 3, semester: 1, academicYear: "2569", year: 2, lecturerId: narinId, status: "active",
    sections: [section("01")], ...body,
  });

describe("a course code across terms", () => {
  it("the same code opens again in another term", async () => {
    const c = code();
    expect((await createCourse({ code: c, semester: 1 })).status).toBe(201);
    expect((await createCourse({ code: c, semester: 2 })).status).toBe(201);
    expect((await createCourse({ code: c, semester: 1, academicYear: "2570" })).status).toBe(201);
  });

  it("the same code twice in one term is refused, and the message says which term", async () => {
    const c = code();
    await createCourse({ code: c });
    const res = await createCourse({ code: c });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("1/2569");
  });

  it("looking a course up by code gives the latest term", async () => {
    const c = code();
    await createCourse({ code: c, semester: 1 });
    const later = (await createCourse({ code: c, semester: 2 })).body.course;
    const res = await request(app).get(`/api/courses/${c}`).set("Authorization", staff);
    expect(res.body.course.id).toBe(later.id);
  });
});

describe("what a lecturer may change on an active course", () => {
  it("not the credits or the sections; the description yes; staff may change the credits", async () => {
    const course = (await createCourse({ code: code() })).body.course;
    expect((await request(app).patch(`/api/courses/${course.id}`).set("Authorization", narinAuth).send({ credits: 1 })).status).toBe(403);
    expect((await request(app).patch(`/api/courses/${course.id}`).set("Authorization", narinAuth).send({ sections: [section("01"), section("02")] })).status).toBe(403);
    expect((await request(app).patch(`/api/courses/${course.id}`).set("Authorization", narinAuth).send({ description: "อัปเดตคำอธิบาย" })).status).toBe(200);
    expect((await request(app).patch(`/api/courses/${course.id}`).set("Authorization", staff).send({ credits: 1 })).status).toBe(200);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).credits).toBe(1);
  });

  it("not the room text either, and a day written in another case is not a change", async () => {
    const course = (await createCourse({ code: code() })).body.course;
    const moved = { ...section("01"), room: "CAMT 999" };
    expect((await request(app).patch(`/api/courses/${course.id}`).set("Authorization", narinAuth).send({ sections: [moved] })).status).toBe(403);
    const sameUpper = { ...section("01"), schedule: [{ day: "Saturday", startTime: "08:00", endTime: "09:00" }] };
    expect((await request(app).patch(`/api/courses/${course.id}`).set("Authorization", narinAuth).send({ sections: [sameUpper] })).status).toBe(200);
  });

  it("changing code or term onto another course's says which term clashes", async () => {
    const c = code();
    await createCourse({ code: c, semester: 1 });
    const other = (await createCourse({ code: c, semester: 2 })).body.course;
    const res = await request(app).patch(`/api/courses/${other.id}`).set("Authorization", staff).send({ semester: 1 });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("1/2569");
  });

  it("an unknown instructor is a 400, not a 500", async () => {
    expect((await createCourse({ code: code(), lecturerId: "no-such-lecturer" })).status).toBe(400);
  });

  it("a pending course of their own is still theirs to shape", async () => {
    const course = (await createCourse({ code: code() }, narinAuth)).body.course;
    expect(course.status).toBe("pending");
    expect((await request(app).patch(`/api/courses/${course.id}`).set("Authorization", narinAuth).send({ credits: 2, sections: [section("01"), section("02")] })).status).toBe(200);
  });

  it("sending the same values back is not a change", async () => {
    const course = (await createCourse({ code: code() })).body.course;
    const res = await request(app).patch(`/api/courses/${course.id}`).set("Authorization", narinAuth).send({ credits: 3, description: "x" });
    expect(res.status).toBe(200);
  });
});

describe("deleting a course", () => {
  it("a course nobody ever enrolled in is removed", async () => {
    const course = (await createCourse({ code: code() })).body.course;
    const res = await request(app).delete(`/api/courses/${course.id}`).set("Authorization", staff);
    expect(res.status).toBe(200);
    expect(res.body.archived).toBe(false);
    expect(await prisma.course.findUnique({ where: { id: course.id } })).toBeNull();
  });

  it("a course with an enrollment (even a dropped one) is archived, not deleted, and the answer says so", async () => {
    const course = (await createCourse({ code: code() })).body.course;
    const student = await freshIntern();
    await prisma.enrollment.create({ data: { studentId: student.profile.id, courseId: course.id, status: "dropped" } });
    const res = await request(app).delete(`/api/courses/${course.id}`).set("Authorization", staff);
    expect(res.status).toBe(200);
    expect(res.body.archived).toBe(true);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).status).toBe("archived");
  });

  it("a lecturer cannot remove an active course", async () => {
    const course = (await createCourse({ code: code() })).body.course;
    expect((await request(app).delete(`/api/courses/${course.id}`).set("Authorization", narinAuth)).status).toBe(403);
  });
});
