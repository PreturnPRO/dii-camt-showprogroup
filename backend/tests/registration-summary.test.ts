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

describe("GET /enrollments/summary", () => {
  it("counts this term's credits without dropped or W, plus ungraded credits in progress", async () => {
    const s = await freshStudent();
    const now3 = await freshCourse({ credits: 3, sections: [] });
    const now2W = await freshCourse({ credits: 2, sections: [] });
    const dropped = await freshCourse({ credits: 4, sections: [] });
    const gradedNow = await freshCourse({ credits: 1, sections: [] });
    const past = await freshCourse({ credits: 5, academicYear: "2568", sections: [] });
    await prisma.enrollment.createMany({ data: [
      { studentId: s.profile.id, courseId: now3.id },
      { studentId: s.profile.id, courseId: now2W.id, letterGrade: "W" },
      { studentId: s.profile.id, courseId: dropped.id, status: "dropped" },
      { studentId: s.profile.id, courseId: gradedNow.id, letterGrade: "A" },
      { studentId: s.profile.id, courseId: past.id, letterGrade: "B" },
    ] });
    const res = await request(app).get("/api/enrollments/summary").set("Authorization", s.auth);
    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ semester: 1, academicYear: "2569", termCredits: 4, inProgressCredits: 3, maxCredits: 22 });
  });

  it("is for students only", async () => {
    expect((await request(app).get("/api/enrollments/summary").set("Authorization", await as("narin@showpro.local"))).status).toBe(403);
  });
});

describe("seat counts on the course list", () => {
  it("counts per section and leaves out dropped enrollments", async () => {
    const c = await freshCourse({ sections: [{}, {}] });
    const [a, b, d] = [await freshStudent(), await freshStudent(), await freshStudent()];
    await prisma.enrollment.createMany({ data: [
      { studentId: a.profile.id, courseId: c.id, sectionId: c.sections[0].id },
      { studentId: b.profile.id, courseId: c.id, sectionId: c.sections[1].id },
      { studentId: d.profile.id, courseId: c.id, sectionId: c.sections[1].id, status: "dropped" },
    ] });
    const res = await request(app).get(`/api/courses?q=${c.code}`).set("Authorization", a.auth);
    const listed = res.body.courses.find((x: { code: string }) => x.code === c.code);
    expect(listed.enrollmentCount).toBe(2);
    const counts = Object.fromEntries(listed.sections.map((s: { number: string; enrolledCount: number }) => [s.number, s.enrolledCount]));
    expect(counts).toEqual({ "01": 1, "02": 1 });
    expect(listed.enrollments.map((e: { studentId: string }) => e.studentId)).toEqual([a.profile.id]); // still only the viewer's own row
  });
});
