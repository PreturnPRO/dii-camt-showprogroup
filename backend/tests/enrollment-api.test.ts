import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

/** a student with no enrollments in term 1/2569, so credits and times never leak between tests */
const freshStudent = async () => {
  const email = uniqueEmail("enrol");
  const user = await prisma.user.create({
    data: {
      email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `T${uid()}`, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569" } },
    },
    include: { studentProfile: true },
  });
  return { profile: user.studentProfile!, email, auth: await as(email) };
};

type SectionSpec = { maxStudents?: number; slots?: Array<{ day: string; startTime: string; endTime: string }> };
const freshCourse = async (opts: {
  lecturer?: string; credits?: number; semester?: number; academicYear?: string; status?: string;
  prerequisites?: string[]; sections?: SectionSpec[];
} = {}) => {
  const lecturer = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: opts.lecturer ?? "narin@showpro.local" } } });
  const code = `E${uid()}`;
  const sections = opts.sections ?? [{}];
  return prisma.course.create({
    data: {
      code, name: code, nameThai: code, credits: opts.credits ?? 3, semester: opts.semester ?? 1, academicYear: opts.academicYear ?? "2569",
      year: 2, lecturerId: lecturer.id, status: opts.status ?? "active", prerequisites: opts.prerequisites ?? [],
      sections: { create: sections.map((s, i) => ({ number: String(i + 1).padStart(2, "0"), maxStudents: s.maxStudents ?? 30, schedule: s.slots ?? [] })) },
    },
    include: { sections: { orderBy: { number: "asc" } } },
  });
};

const enroll = (auth: string, body: Record<string, unknown>) => request(app).post("/api/enrollments").set("Authorization", auth).send(body);
const staff = () => as("staff@showpro.local");

describe("student self-enrollment rules", () => {
  it("enrolls in an open course of the current term and its chosen section", async () => {
    const s = await freshStudent();
    const c = await freshCourse({ sections: [{}, {}] });
    const res = await enroll(s.auth, { courseId: c.id, sectionId: c.sections[1].id });
    expect(res.status).toBe(201);
    expect(res.body.enrollment.sectionId).toBe(c.sections[1].id);
  });

  it("needs a section of this course when the course has sections, and none when it has none", async () => {
    const s = await freshStudent();
    const c = await freshCourse();
    const other = await freshCourse();
    expect((await enroll(s.auth, { courseId: c.id })).status).toBe(400);
    expect((await enroll(s.auth, { courseId: c.id, sectionId: other.sections[0].id })).status).toBe(400);
    const bare = await freshCourse({ sections: [] });
    expect((await enroll(s.auth, { courseId: bare.id, sectionId: c.sections[0].id })).status).toBe(400);
    expect((await enroll(s.auth, { courseId: bare.id })).status).toBe(201);
  });

  it("refuses other terms, non-active courses and full sections", async () => {
    const s = await freshStudent();
    for (const c of [await freshCourse({ academicYear: "2568" }), await freshCourse({ semester: 2 }), await freshCourse({ status: "pending" }), await freshCourse({ sections: [{ maxStudents: 1 }] })]) {
      if (c.sections[0].maxStudents === 1) await enroll((await freshStudent()).auth, { courseId: c.id, sectionId: c.sections[0].id });
      expect((await enroll(s.auth, { courseId: c.id, sectionId: c.sections[0].id })).status).toBe(409);
    }
    expect(await prisma.enrollment.count({ where: { studentId: s.profile.id } })).toBe(0);
  });

  it("counts dropped enrollments as free seats", async () => {
    const c = await freshCourse({ sections: [{ maxStudents: 1 }] });
    const first = await freshStudent();
    expect((await enroll(first.auth, { courseId: c.id, sectionId: c.sections[0].id })).status).toBe(201);
    expect((await request(app).delete(`/api/enrollments/course/${c.id}`).set("Authorization", first.auth)).status).toBe(200);
    expect((await enroll((await freshStudent()).auth, { courseId: c.id, sectionId: c.sections[0].id })).status).toBe(201);
  });

  it("checks prerequisites that exist and skips codes that do not", async () => {
    const s = await freshStudent();
    const pre = await freshCourse({ sections: [] });
    const next = await freshCourse({ prerequisites: [pre.code, "GHOST999"] });
    const body = { courseId: next.id, sectionId: next.sections[0].id };
    expect((await enroll(s.auth, body)).body.message).toMatch(pre.code);
    await prisma.enrollment.create({ data: { studentId: s.profile.id, courseId: pre.id, letterGrade: "W" } });
    expect((await enroll(s.auth, body)).status).toBe(409);
    await prisma.enrollment.updateMany({ where: { studentId: s.profile.id, courseId: pre.id }, data: { letterGrade: "F" } });
    expect((await enroll(s.auth, body)).status).toBe(201);
  });

  it("stops at 22 credits in the term, not counting W or other terms", async () => {
    const s = await freshStudent();
    const big = await freshCourse({ credits: 21, sections: [] });
    await prisma.enrollment.create({ data: { studentId: s.profile.id, courseId: big.id } });
    const past = await freshCourse({ credits: 9, academicYear: "2568", sections: [] });
    await prisma.enrollment.create({ data: { studentId: s.profile.id, courseId: past.id, letterGrade: "A" } });
    const two = await freshCourse({ credits: 2 });
    const res = await enroll(s.auth, { courseId: two.id, sectionId: two.sections[0].id });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/22/);
    await prisma.enrollment.updateMany({ where: { studentId: s.profile.id, courseId: big.id }, data: { letterGrade: "W" } });
    expect((await enroll(s.auth, { courseId: two.id, sectionId: two.sections[0].id })).status).toBe(201);
  });

  it("detects a clash with the section actually taken, only within the same term", async () => {
    const s = await freshStudent();
    const taken = await freshCourse({ sections: [{ slots: [{ day: "monday", startTime: "09:00", endTime: "10:00" }] }, { slots: [{ day: "Thursday", startTime: "13:00", endTime: "16:00" }] }] });
    await prisma.enrollment.create({ data: { studentId: s.profile.id, courseId: taken.id, sectionId: taken.sections[1].id } });
    const lastYear = await freshCourse({ academicYear: "2568", sections: [{ slots: [{ day: "friday", startTime: "09:00", endTime: "12:00" }] }] });
    await prisma.enrollment.create({ data: { studentId: s.profile.id, courseId: lastYear.id, sectionId: lastYear.sections[0].id, letterGrade: "B" } });

    const clash = await freshCourse({ sections: [{ slots: [{ day: "thursday", startTime: "15:00", endTime: "17:00" }] }] });
    const res = await enroll(s.auth, { courseId: clash.id, sectionId: clash.sections[0].id });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(taken.code);
    const friday = await freshCourse({ sections: [{ slots: [{ day: "friday", startTime: "09:00", endTime: "12:00" }] }] });
    expect((await enroll(s.auth, { courseId: friday.id, sectionId: friday.sections[0].id })).status).toBe(201);
  });
});

describe("who may enroll whom", () => {
  it("staff skip every rule but still need a section of this course", async () => {
    const s = await freshStudent();
    const closed = await freshCourse({ status: "pending", academicYear: "2568", sections: [{ maxStudents: 1 }] });
    const auth = await staff();
    await enroll(auth, { studentId: (await freshStudent()).profile.id, courseId: closed.id, sectionId: closed.sections[0].id });
    expect((await enroll(auth, { studentId: s.profile.id, courseId: closed.id, sectionId: closed.sections[0].id })).status).toBe(201);
    const other = await freshCourse();
    expect((await enroll(auth, { studentId: s.profile.id, courseId: other.id, sectionId: closed.sections[0].id })).status).toBe(400);
    expect((await enroll(auth, { studentId: s.profile.id, courseId: closed.id, sectionId: closed.sections[0].id })).status).toBe(409);
  });

  it("lecturers enroll only into their own courses and under the student rules", async () => {
    const s = await freshStudent();
    const narin = await as("narin@showpro.local");
    const malis = await freshCourse({ lecturer: "mali@showpro.local" });
    expect((await enroll(narin, { studentId: s.profile.id, courseId: malis.id, sectionId: malis.sections[0].id })).status).toBe(403);
    const pending = await freshCourse({ status: "pending" });
    expect((await enroll(narin, { studentId: s.profile.id, courseId: pending.id, sectionId: pending.sections[0].id })).status).toBe(409);
    const own = await freshCourse();
    expect((await enroll(narin, { studentId: s.profile.id, courseId: own.id, sectionId: own.sections[0].id })).status).toBe(201);
  });
});

describe("concurrent requests", () => {
  it("two students racing for the last seat: one wins, one gets 409", async () => {
    const c = await freshCourse({ sections: [{ maxStudents: 1 }] });
    const [a, b] = [await freshStudent(), await freshStudent()];
    const results = await Promise.all([a, b].map((s) => enroll(s.auth, { courseId: c.id, sectionId: c.sections[0].id })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.enrollment.count({ where: { sectionId: c.sections[0].id, status: { not: "dropped" } } })).toBe(1);
  });

  it("the same student double-clicking gets 409, never 500", async () => {
    const s = await freshStudent();
    const c = await freshCourse();
    const results = await Promise.all([1, 2].map(() => enroll(s.auth, { courseId: c.id, sectionId: c.sections[0].id })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });
});
