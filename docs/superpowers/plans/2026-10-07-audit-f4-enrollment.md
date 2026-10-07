# Audit F4: ลงทะเบียนเรียนตามกฎจริง Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** การลงทะเบียนตรวจกฎจริงที่ backend ได้แก่ เทอม สถานะวิชา section ที่นั่ง วิชาบังคับก่อน เพดาน 22 หน่วยกิต และเวลาเรียนชน (ดูจาก section ที่เลือกจริง เทียบเฉพาะเทอมเดียวกัน) · ลงพร้อมกันหลายคำขอแล้วไม่ล้นที่นั่ง ไม่เกิด 500 · อาจารย์ลงให้ได้เฉพาะวิชาตัวเอง · หน้าเว็บให้เลือก section และยืนยันทั้งตอนลงและตอนถอน · ตัวเลขหน่วยกิตมาจาก API ทั้งหมด ไม่มี progress ปลอม

**Architecture:** backend: โมดูล pure `backend/src/services/enrollment-rules.ts` รับข้อมูลที่ query มาแล้ว คืนข้อผิดพลาดข้อแรกที่เจอ ทดสอบแบบ unit ได้ · `createEnrollment` แยก "ใครลงให้ใครได้" กับ "section ต้องเป็นของวิชา" ซึ่งใช้กับทุก role ออกจากกฎที่ staff/admin ข้ามได้ แล้วทำทั้งหมดใน transaction เดียวที่ lock แถว StudentProfile และ Section (`SELECT … FOR UPDATE`) · `GET /enrollments/summary` ส่งหน่วยกิตเทอมนี้และเพดาน · รายการวิชาส่ง `enrolledCount` ต่อ section (ไม่นับคนที่ถอน) · frontend: `src/lib/course-seats.ts` (pure) + dialog ลงทะเบียน/ถอนใน Courses.tsx · dashboard ใช้ summary

**Tech Stack:** Express 4, Prisma 6 (PostgreSQL), Zod, Vitest + supertest, React 18, Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` F4 · `2-backend-academic.md` ("[MEDIUM] Enrollment lacks capacity, prerequisite, status and section validation"; ตาราง "Enroll others | any lecturer, any course") · `4-frontend-student.md` ("Courses page: fake progress…", "no confirm on drop") · **การตัดสินของ Por 7/10/69:**
- prereq: ผ่านเมื่อ "เคยลง" = มี enrollment ของรหัสนั้นที่ `status !== "dropped"` และ `letterGrade !== "W"` (กำลังเรียนอยู่ หรือมีเกรด A–F/I แล้ว — F ก็นับว่าผ่าน) · รหัส prereq ที่ไม่มีวิชาในระบบให้ข้าม
- เพดาน 22 หน่วยกิตต่อเทอม บังคับที่ backend มีค่าคงที่ที่เดียว หน้าเว็บอ่านค่าจาก API · วิชาที่ได้ W ไม่นับ
- ลงได้เฉพาะวิชา `status === "active"` ในเทอมปัจจุบันของนักศึกษา (`StudentProfile.semester` + `academicYear`) · section ต้องเป็นของวิชานั้น · ที่นั่งต้องยังไม่เต็ม
- staff/admin ลงแทนได้โดยข้ามทุกกฎ **ยกเว้น** section ต้องเป็นของวิชานั้น และห้ามลงซ้ำ
- อาจารย์ลงให้ได้เฉพาะวิชาที่ตัวเองสอน และต้องผ่านทุกกฎเหมือนนักศึกษาลงเอง
- แยก F5 (เช็คชื่อ) เป็นแผนถัดไป

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `54c9066`) · **ห้าม commit/push ระหว่างรัน** — Por อนุมัติตอนจบ (ขั้น "Commit" ในแต่ละ task ข้ามไป)
- เทสต์ backend ใช้ DB `showpro_main_test` (`cd backend && npm test`) · E2E ใช้ dev DB `showpro_main` · ไม่มี migration
- ⚠️ รีสตาร์ต backend dev (`npm run dev` ใน backend, :4000) ก่อน E2E ทุกครั้ง เพราะ tsx watch ไม่โหลดโค้ดใหม่ · vite :8080 จาก worktree
- ข้อความ error ภาษาอังกฤษ · ข้อความไทยห้ามมี letter-spacing · ตัวเลขบนจอต้องบอกได้ว่าคืออะไร ขอบเขตแค่ไหน เทียบกับอะไร เพดานเท่าไร
- `MAX_TERM_CREDITS = 22` อยู่ที่ `backend/src/services/enrollment-rules.ts` ที่เดียว · หน้าเว็บห้ามมีเลข 22 เขียนตายตัว
- status code: section ไม่ใช่ของวิชา/ขาด sectionId = **400** · อาจารย์ลงวิชาคนอื่น = **403** · ละเมิดกฎ (เทอม, สถานะ, ที่นั่ง, prereq, หน่วยกิต, เวลาชน, ลงซ้ำ) = **409**

**Seed ที่เทสต์อ้างอิง:** วิชาใน seed มี 2 วิชา คือ DII340 (narin สอน, prereq `DII210` ไม่มีในระบบ, section 01 จันทร์ 09:00–12:00 max 40) และ DII420 (mali สอน, prereq `DII310` ไม่มีในระบบ, max 35) · ทั้งคู่อยู่เทอม 1/2569 · นักศึกษา alice, bob, chompoo อยู่เทอม 1/2569 · รหัสผ่าน `Password123!` · **เทสต์ backend ให้สร้างนักศึกษาและวิชาใหม่ทุกครั้ง** ห้ามใช้ alice/bob ลงวิชา เพราะหน่วยกิตกับเวลาเรียนจะสะสมข้ามเทสต์

## Review Focus

1. คำขอลงทะเบียน 2 คำขอพร้อมกันเพื่อแย่งที่นั่งสุดท้าย ต้องได้ 201 หนึ่งอัน 409 หนึ่งอัน และที่นั่งไม่เกิน max (Task 2)
2. นักศึกษาคนเดียวกดลงวิชาเดิมซ้ำพร้อมกัน 2 ครั้ง ต้องได้ 409 ไม่ใช่ 500 จาก unique constraint (Task 2)
3. เวลาเรียนชนกับ section ที่ 2 ของวิชาที่ลงไว้ (ไม่ใช่ `sections[0]`) ต้องถูกจับ และวิชาเทอมอื่นที่เวลาตรงกันต้องไม่ถูกนับว่าชน (Task 1, Task 2)
4. วิชาที่ไม่มี section เลยต้องยังลงได้ (ไม่มีเพดานที่นั่ง) และห้ามส่ง sectionId มา (Task 2)
5. ช่องหน่วยกิตบนหน้าเว็บต้องเป็นหน่วยกิตเทอมปัจจุบัน ไม่ใช่ผลรวมทุกเทอม และวิชาที่ถอนแล้วต้องไม่ถูกนับ (Task 3, Task 4)

---

### Task 1: โมดูลกฎลงทะเบียน (pure)

**Files:**
- Create: `backend/src/services/enrollment-rules.ts`, `backend/tests/enrollment-rules.test.ts`

**Interfaces — Produces:**
- `MAX_TERM_CREDITS = 22`
- `type Slot = { day: string; startTime: string; endTime: string }`
- `parseSlots(schedule: unknown): Slot[]` — รับ JSON ของ `Section.schedule` · ทิ้งช่องที่ไม่มี day/startTime/endTime · `day` แปลงเป็น lowercase และ trim
- `type RuleInput` (ดูโค้ด) · `type Violation = { status: 409; message: string }`
- `findEnrollmentViolation(input: RuleInput): Violation | null` — ตรวจตามลำดับ: เทอม → สถานะ → ที่นั่ง → prereq → หน่วยกิต → เวลาชน แล้วคืนข้อแรกที่ผิด

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/enrollment-rules.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { findEnrollmentViolation, MAX_TERM_CREDITS, parseSlots, type RuleInput } from "../src/services/enrollment-rules";

const base = (over: Partial<RuleInput> = {}): RuleInput => ({
  student: { semester: 1, academicYear: "2569" },
  course: { code: "NEW100", credits: 3, semester: 1, academicYear: "2569", status: "active", prerequisites: [] },
  section: { maxStudents: 30, slots: [{ day: "tuesday", startTime: "09:00", endTime: "12:00" }] },
  sectionSeatsTaken: 0,
  knownCourseCodes: new Set<string>(),
  history: [],
  termEnrollments: [],
  ...over,
});

describe("parseSlots", () => {
  it("keeps valid slots, lowercases the day and drops broken ones", () => {
    expect(parseSlots([{ day: " Monday ", startTime: "09:00", endTime: "12:00", room: "x" }, { day: "friday" }, "junk"])).toEqual([
      { day: "monday", startTime: "09:00", endTime: "12:00" },
    ]);
    expect(parseSlots(null)).toEqual([]);
  });
});

describe("findEnrollmentViolation", () => {
  it("accepts an open course in the student's term", () => {
    expect(findEnrollmentViolation(base())).toBeNull();
  });

  it("rejects another term and a non-active course", () => {
    expect(findEnrollmentViolation(base({ course: { ...base().course, academicYear: "2568" } }))?.message).toMatch(/current term/);
    expect(findEnrollmentViolation(base({ course: { ...base().course, semester: 2 } }))?.message).toMatch(/current term/);
    expect(findEnrollmentViolation(base({ course: { ...base().course, status: "pending" } }))?.message).toMatch(/not open/);
  });

  it("rejects a full section and allows a course without sections", () => {
    expect(findEnrollmentViolation(base({ sectionSeatsTaken: 30 }))?.message).toMatch(/full/);
    expect(findEnrollmentViolation(base({ section: null, sectionSeatsTaken: 0 }))).toBeNull();
  });

  it("prerequisites: taken or in progress passes, W/dropped/missing fails, unknown codes are skipped", () => {
    const course = { ...base().course, prerequisites: ["PRE100", "GHOST999"] };
    const known = new Set(["PRE100"]);
    const run = (history: RuleInput["history"]) => findEnrollmentViolation(base({ course, knownCourseCodes: known, history }));
    expect(run([])?.message).toMatch(/PRE100/);
    expect(run([{ courseCode: "PRE100", status: "enrolled", letterGrade: null }])).toBeNull();
    expect(run([{ courseCode: "PRE100", status: "enrolled", letterGrade: "F" }])).toBeNull();
    expect(run([{ courseCode: "PRE100", status: "enrolled", letterGrade: "I" }])).toBeNull();
    expect(run([{ courseCode: "PRE100", status: "enrolled", letterGrade: "W" }])?.message).toMatch(/PRE100/);
    expect(run([{ courseCode: "PRE100", status: "dropped", letterGrade: null }])?.message).toMatch(/PRE100/);
  });

  it("enforces the term credit limit and ignores W courses", () => {
    const at = (credits: number, letterGrade: string | null = null) => ({ courseCode: `C${credits}${letterGrade}`, credits, letterGrade, slots: [] });
    expect(findEnrollmentViolation(base({ termEnrollments: [at(MAX_TERM_CREDITS - 3)] }))).toBeNull();
    expect(findEnrollmentViolation(base({ termEnrollments: [at(MAX_TERM_CREDITS - 2)] }))?.message).toMatch(/22/);
    expect(findEnrollmentViolation(base({ termEnrollments: [at(MAX_TERM_CREDITS - 3), at(6, "W")] }))).toBeNull();
  });

  it("detects overlapping slots on the same day, case-insensitively, and allows touching edges", () => {
    const taken = (day: string, startTime: string, endTime: string) => ({ courseCode: "OLD200", credits: 3, letterGrade: null, slots: [{ day, startTime, endTime }] });
    expect(findEnrollmentViolation(base({ termEnrollments: [taken("tuesday", "11:00", "13:00")] }))?.message).toMatch(/OLD200/);
    expect(findEnrollmentViolation(base({ section: { maxStudents: 30, slots: parseSlots([{ day: "Tuesday", startTime: "10:00", endTime: "11:00" }]) }, termEnrollments: [taken("tuesday", "09:30", "10:30")] }))?.message).toMatch(/OLD200/);
    expect(findEnrollmentViolation(base({ termEnrollments: [taken("tuesday", "12:00", "15:00")] }))).toBeNull();
    expect(findEnrollmentViolation(base({ termEnrollments: [taken("wednesday", "09:00", "12:00")] }))).toBeNull();
  });
});
```

- [ ] **Step 2: รันให้ fail** — `cd backend && npx vitest run tests/enrollment-rules.test.ts` → FAIL (หาโมดูลไม่เจอ)

- [ ] **Step 3: เขียนโมดูล** — `backend/src/services/enrollment-rules.ts`

```ts
/** Registration rules a student (or a lecturer on the student's behalf) must pass. Staff/admin skip these. */
export const MAX_TERM_CREDITS = 22;

export type Slot = { day: string; startTime: string; endTime: string };

export type RuleInput = {
  student: { semester: number; academicYear: string };
  course: { code: string; credits: number; semester: number; academicYear: string; status: string; prerequisites: string[] };
  /** the chosen section, or null when the course has no sections */
  section: { maxStudents: number; slots: Slot[] } | null;
  /** non-dropped enrollments already in the chosen section */
  sectionSeatsTaken: number;
  /** prerequisite codes that exist as courses; others are skipped */
  knownCourseCodes: Set<string>;
  /** every enrollment the student has, any term */
  history: Array<{ courseCode: string; status: string; letterGrade: string | null }>;
  /** the student's other enrollments in the course's term, already without dropped and W */
  termEnrollments: Array<{ courseCode: string; credits: number; letterGrade: string | null; slots: Slot[] }>;
};

export type Violation = { status: 409; message: string };

export const parseSlots = (schedule: unknown): Slot[] =>
  (Array.isArray(schedule) ? schedule : []).flatMap((slot) => {
    if (!slot || typeof slot !== "object") return [];
    const { day, startTime, endTime } = slot as Record<string, unknown>;
    if (typeof day !== "string" || typeof startTime !== "string" || typeof endTime !== "string") return [];
    return [{ day: day.trim().toLowerCase(), startTime, endTime }];
  });

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const overlaps = (a: Slot, b: Slot) =>
  a.day === b.day && Math.max(toMinutes(a.startTime), toMinutes(b.startTime)) < Math.min(toMinutes(a.endTime), toMinutes(b.endTime));

const fail = (message: string): Violation => ({ status: 409, message });

export const findEnrollmentViolation = (input: RuleInput): Violation | null => {
  const { student, course, section } = input;

  if (course.semester !== student.semester || course.academicYear !== student.academicYear) {
    return fail(`${course.code} is not offered in your current term (${student.semester}/${student.academicYear})`);
  }
  if (course.status !== "active") return fail(`${course.code} is not open for registration`);
  if (section && input.sectionSeatsTaken >= section.maxStudents) return fail(`This section of ${course.code} is full`);

  const missing = course.prerequisites.filter(
    (code) =>
      input.knownCourseCodes.has(code) &&
      !input.history.some((e) => e.courseCode === code && e.status !== "dropped" && e.letterGrade !== "W"),
  );
  if (missing.length > 0) return fail(`Prerequisite not taken: ${missing.join(", ")}`);

  const termCredits = input.termEnrollments.filter((e) => e.letterGrade !== "W").reduce((sum, e) => sum + e.credits, 0);
  if (termCredits + course.credits > MAX_TERM_CREDITS) {
    return fail(`Credit limit exceeded: ${termCredits} + ${course.credits} is over ${MAX_TERM_CREDITS} credits this term`);
  }

  for (const slot of section?.slots ?? []) {
    const clash = input.termEnrollments.find((e) => e.letterGrade !== "W" && e.slots.some((s) => overlaps(slot, s)));
    if (clash) return fail(`Schedule conflicts with ${clash.courseCode}`);
  }
  return null;
};
```

- [ ] **Step 4: รันให้ผ่าน** — `cd backend && npx vitest run tests/enrollment-rules.test.ts` → PASS ทั้งหมด

- [ ] **Step 5: Commit** — ข้าม (Por อนุมัติตอนจบ)

---

### Task 2: `createEnrollment` ใช้กฎ + ใครลงให้ใคร + กันแย่งที่นั่ง

**Files:**
- Modify: `backend/src/services/enrollment.service.ts` (`createEnrollment` ทั้งฟังก์ชัน ตั้งแต่บรรทัด 46)
- Create: `backend/tests/enrollment-api.test.ts`
- ไม่ต้องแก้ route: `POST /enrollments` ยังรับ STUDENT/STAFF/ADMIN/LECTURER (`academic.routes.ts:92-98`)

**Interfaces:**
- Consumes: `findEnrollmentViolation`, `parseSlots` จาก Task 1 · `getLecturerProfileByUserId`, `getStudentProfileByAnyId`, `getStudentProfileByUserId` (`profile.service.ts`)
- Produces: `createEnrollment(currentUser, { studentId?, courseId, sectionId? })` signature เดิม · response เดิม (enrollment + student + course + section)

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/enrollment-api.test.ts`

```ts
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
```

> หมายเหตุ: เทสต์ staff ตั้งใจเติมที่นั่งให้เต็มด้วย staff ก่อน แล้วลง `s` ซ้อนเข้าไปอีกคน เพื่อพิสูจน์ว่า staff ข้ามทั้งสถานะ เทอม และที่นั่ง (อีเมล `staff@showpro.local` ตรงกับ seed แล้ว)

- [ ] **Step 2: รันให้ fail** — `cd backend && npx vitest run tests/enrollment-api.test.ts` → คาดว่าเกือบทุกข้อ FAIL (ตอนนี้ลงได้หมด / race ได้ 500)

- [ ] **Step 3: เขียน `createEnrollment` ใหม่** — แทนที่ฟังก์ชันเดิมใน `enrollment.service.ts` (`getEnrollments` และ `dropCourseByStudent` ไม่แตะ) · เพิ่ม import `Prisma` จาก `@prisma/client` และ `{ findEnrollmentViolation, parseSlots }` จาก `./enrollment-rules`

```ts
const enrollmentInclude = {
  student: { include: { user: true } },
  course: true,
  section: true,
} as const;

export const createEnrollment = async (currentUser: any, data: { studentId?: string; courseId: string; sectionId?: string }) => {
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByUserId(currentUser.id)
      : data.studentId
        ? await getStudentProfileByAnyId(data.studentId)
        : null;

  if (!student) {
    throw new AppError(400, "studentId is required for staff, admin, and lecturer enrollments");
  }

  const course = await prisma.course.findUnique({ where: { id: data.courseId }, include: { sections: true } });
  if (!course) {
    throw new AppError(404, "Course not found");
  }

  if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    if (course.lecturerId !== lecturer.id) {
      throw new AppError(403, "Lecturers can only enroll students in their own courses");
    }
  }

  // every role: the section must belong to this course
  let section: (typeof course.sections)[number] | null = null;
  if (course.sections.length > 0) {
    if (!data.sectionId) throw new AppError(400, "sectionId is required for a course with sections");
    section = course.sections.find((s) => s.id === data.sectionId) ?? null;
    if (!section) throw new AppError(400, "Section does not belong to this course");
  } else if (data.sectionId) {
    throw new AppError(400, "This course has no sections");
  }

  // owner decision 7/10/69: staff/admin enroll on the faculty's behalf and skip the registration rules
  const skipRules = currentUser.role === Role.STAFF || currentUser.role === Role.ADMIN;

  try {
    return await prisma.$transaction(async (tx) => {
      // serialize per student (credits, times, duplicates) and per section (seats)
      await tx.$queryRaw`SELECT id FROM "StudentProfile" WHERE id = ${student.id} FOR UPDATE`;
      if (section) await tx.$queryRaw`SELECT id FROM "Section" WHERE id = ${section.id} FOR UPDATE`;

      const existing = await tx.enrollment.findFirst({ where: { studentId: student.id, courseId: course.id } });
      if (existing && existing.status !== "dropped") {
        throw new AppError(409, "Student is already enrolled in this course");
      }

      if (!skipRules) {
        const history = await tx.enrollment.findMany({
          where: { studentId: student.id },
          include: { course: { select: { code: true, credits: true, semester: true, academicYear: true } }, section: { select: { schedule: true } } },
        });
        const known = await tx.course.findMany({ where: { code: { in: course.prerequisites } }, select: { code: true } });
        const seatsTaken = section
          ? await tx.enrollment.count({ where: { sectionId: section.id, status: { not: "dropped" } } })
          : 0;

        const violation = findEnrollmentViolation({
          student: { semester: student.semester, academicYear: student.academicYear },
          course,
          section: section ? { maxStudents: section.maxStudents, slots: parseSlots(section.schedule) } : null,
          sectionSeatsTaken: seatsTaken,
          knownCourseCodes: new Set(known.map((k) => k.code)),
          history: history.map((e) => ({ courseCode: e.course.code, status: e.status, letterGrade: e.letterGrade })),
          termEnrollments: history
            .filter(
              (e) =>
                e.courseId !== course.id &&
                e.status !== "dropped" &&
                e.letterGrade !== "W" &&
                e.course.semester === course.semester &&
                e.course.academicYear === course.academicYear,
            )
            .map((e) => ({ courseCode: e.course.code, credits: e.course.credits, letterGrade: e.letterGrade, slots: parseSlots(e.section?.schedule) })),
        });
        if (violation) throw new AppError(violation.status, violation.message);
      }

      // re-enrolling after a drop reuses the row (unique studentId+courseId) and starts clean
      if (existing) {
        await tx.enrollmentScore.deleteMany({ where: { enrollmentId: existing.id } });
      }
      const enrollment = existing
        ? await tx.enrollment.update({
            where: { id: existing.id },
            data: { status: "enrolled", sectionId: section?.id ?? null, total: null, letterGrade: null, remarks: null, gradedBy: null, gradedAt: null },
            include: enrollmentInclude,
          })
        : await tx.enrollment.create({
            data: { studentId: student.id, courseId: course.id, sectionId: section?.id ?? null },
            include: enrollmentInclude,
          });

      await tx.timelineEvent.create({
        data: {
          studentId: enrollment.studentId,
          type: "enrollment",
          title: `Enrolled in ${enrollment.course.code}`,
          titleThai: `ลงทะเบียน ${enrollment.course.code}`,
          description: `ลงทะเบียนเรียนวิชา ${enrollment.course.name} สำเร็จ`,
          semester: enrollment.course.semester,
          academicYear: enrollment.course.academicYear,
          relatedId: enrollment.courseId,
          relatedType: "course",
          tags: ["enrollment", enrollment.course.code],
        },
      });

      return enrollment;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Student is already enrolled in this course");
    }
    throw error;
  }
};
```

> ถ้า Postgres ตั้งชื่อตารางต่างจากชื่อ model (เช็ค `@@map` ใน schema.prisma — ตอนนี้ไม่มี) ต้องแก้ชื่อใน `$queryRaw` ให้ตรง

- [ ] **Step 4: รันให้ผ่าน** — `cd backend && npx vitest run tests/enrollment-api.test.ts tests/drop-and-transcript.test.ts` → PASS · แล้วรันทั้งชุด `cd backend && npm test` → ผ่านทั้งหมด (ก่อนหน้านี้ 185 + ของใหม่) · ถ้ามีเทสต์เดิมที่ลงทะเบียนผ่าน API แล้วพังเพราะกฎใหม่ ให้อ่านสาเหตุก่อน ห้ามแก้เทสต์เดิมให้ผ่านโดยไม่บันทึกเหตุผลลง ledger

- [ ] **Step 5: Commit** — ข้าม

---

### Task 3: API ที่หน้าเว็บต้องใช้ — สรุปหน่วยกิตเทอม + ที่นั่งต่อ section

**Files:**
- Modify: `backend/src/services/enrollment.service.ts` (เพิ่ม `getRegistrationSummary`)
- Modify: `backend/src/controllers/academic.controller.ts` (เพิ่ม `registrationSummaryHandler`)
- Modify: `backend/src/routes/academic.routes.ts` (เพิ่ม `GET /enrollments/summary` **ก่อน** route `/enrollments` อื่น ๆ ที่มี param)
- Modify: `backend/src/services/access-policy.ts` (`scopeCourseForViewer`: `enrollmentCount` ไม่นับคนที่ถอน + `sections[].enrolledCount`)
- Create: `backend/tests/registration-summary.test.ts`

**Interfaces — Produces:**
- `GET /api/enrollments/summary` (STUDENT เท่านั้น ส่วน role อื่นได้ 403) → `{ success: true, summary: { semester: number; academicYear: string; termCredits: number; inProgressCredits: number; maxCredits: number } }`
  - `termCredits` = หน่วยกิตของวิชาเทอมปัจจุบันที่ `status !== "dropped"` และ `letterGrade !== "W"` (นิยามเดียวกับที่ใช้ตรวจเพดาน)
  - `inProgressCredits` = หน่วยกิตของวิชาทุกเทอมที่ `status !== "dropped"` และ `letterGrade === null` (ใช้กับช่อง "กำลังเรียน" ใน DegreeProgressCard ซึ่งเดิมนับรวมทุกวิชาและซ้ำกับ "สำเร็จแล้ว")
  - `maxCredits` = `MAX_TERM_CREDITS`
- course ที่ผ่าน `scopeCourseForViewer`: `enrollmentCount` = จำนวน enrollment ที่ `status !== "dropped"` · แต่ละ section มี `enrolledCount` (นับเฉพาะ `sectionId` ตรงกันและไม่ถอน) — ทุก viewer เห็นตัวเลขนี้ได้ เพราะเป็นจำนวนนับ ไม่ใช่รายชื่อ

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/registration-summary.test.ts` (ใช้ `freshStudent`/`freshCourse` แบบเดียวกับ Task 2 — คัดลอกสองฟังก์ชันนั้นมาไว้ที่ไฟล์นี้ด้วย ห้าม import ข้ามไฟล์เทสต์)

```ts
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
```

- [ ] **Step 2: รันให้ fail** — `cd backend && npx vitest run tests/registration-summary.test.ts` → FAIL (404 / ไม่มี `enrolledCount`)

- [ ] **Step 3: เขียนโค้ด**

`enrollment.service.ts` (เพิ่ม import `MAX_TERM_CREDITS`):

```ts
export const getRegistrationSummary = async (currentUser: any) => {
  const student = await getStudentProfileByUserId(currentUser.id);
  const rows = await prisma.enrollment.findMany({
    where: { studentId: student.id, status: { not: "dropped" } },
    select: { letterGrade: true, course: { select: { credits: true, semester: true, academicYear: true } } },
  });
  const termCredits = rows
    .filter((r) => r.letterGrade !== "W" && r.course.semester === student.semester && r.course.academicYear === student.academicYear)
    .reduce((sum, r) => sum + r.course.credits, 0);
  const inProgressCredits = rows.filter((r) => r.letterGrade === null).reduce((sum, r) => sum + r.course.credits, 0);
  return { semester: student.semester, academicYear: student.academicYear, termCredits, inProgressCredits, maxCredits: MAX_TERM_CREDITS };
};
```

`academic.controller.ts`:

```ts
export const registrationSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getRegistrationSummary(requireUser(req));
  res.json({ success: true, summary });
});
```

`academic.routes.ts` (วางก่อน `router.get("/enrollments", …)`):

```ts
router.get("/enrollments/summary", requireAuth, checkRole([Role.STUDENT]), registrationSummaryHandler);
```

`access-policy.ts` — ขยาย `ScopableCourse` ให้ enrollment มี `status?: string; sectionId?: string | null` และ course มี `sections?: Array<{ id: string } & object>` แล้วใน `scopeCourseForViewer` คำนวณก่อน early return ทั้งสองจุด:

```ts
export const scopeCourseForViewer = <T extends ScopableCourse>(course: T, viewer: ViewerContext | null): T => {
  const all = course.enrollments ?? [];
  const active = all.filter((e) => e.status !== "dropped");
  const withSeats = {
    ...course,
    ...(course.sections && course.enrollments
      ? { sections: course.sections.map((s) => ({ ...s, enrolledCount: active.filter((e) => e.sectionId === s.id).length })) }
      : {}),
  };
  if (viewer && isStaffOrAdmin(viewer.role)) return withSeats;
  if (viewer?.role === Role.LECTURER && viewer.lecturerProfileId === course.lecturerId) return withSeats;

  const visible =
    viewer?.role === Role.STUDENT && viewer.studentProfileId
      ? all.filter((e) => e.studentId === viewer.studentProfileId)
      : [];

  return {
    ...withSeats,
    ...(course.enrollments
      ? {
          enrollmentCount: active.length,
          enrollments: visible.map((e) =>
            e.student ? { ...e, student: { ...e.student, user: publicUser(e.student.user, true) } } : e,
          ),
        }
      : {}),
    ...(course.lecturer ? { lecturer: { ...course.lecturer, user: publicUser(course.lecturer.user, true) } } : {}),
  };
};
```

> อ่าน `ScopableCourse` ตัวจริงก่อนแก้ แล้วรักษา field เดิมทุกตัว · เช็คว่า `getCourses`/`getCourseById` ส่ง `sections` กับ `enrollments` (ที่มี `status`, `sectionId`) มาให้จริง (`getCourses` ใช้ `enrollments: true` อยู่แล้ว)

- [ ] **Step 4: รันให้ผ่าน** — `cd backend && npx vitest run tests/registration-summary.test.ts tests/courses-exposure.test.ts` → PASS · แล้ว `npm test` ทั้งชุด

- [ ] **Step 5: Commit** — ข้าม

---

### Task 4: หน้าเว็บ — เลือก section, ยืนยันลง/ถอน, หน่วยกิตจาก API

**Files:**
- Create: `src/lib/course-seats.ts`, `src/lib/course-seats.test.ts`
- Modify: `src/types/index.ts` (`Section` เพิ่ม `enrolledCount?: number`)
- Modify: `src/lib/live-mappers.ts` (`mapCourse` → section: `enrolledCount: asNumber(section.enrolledCount, <จำนวน enrolledStudents ของ section>)`)
- Modify: `src/lib/api.ts` (`enrollments.summary`)
- Modify: `src/pages/Courses.tsx`
- Modify: `src/pages/dashboards/StudentDashboard.tsx:635`, `src/pages/PersonalDashboard.tsx:747` (`registeredCredits` → `summary.inProgressCredits`) · `src/components/dashboard/DegreeProgressCard.tsx` (ป้าย "ลงทะเบียน" → "กำลังเรียน" / "In progress")
- Modify: `src/i18n/translations/th.ts:732`, `en.ts:732` (ลบ `maxCredits` ที่เขียน 22 ตายตัว — ใช้ข้อความที่สร้างจากค่า API แทน)
- Create: `e2e/course-registration.spec.ts`

**Interfaces:**
- Consumes: `GET /enrollments/summary`, `sections[].enrolledCount` (Task 3) · ข้อความ error 409/400 จาก Task 2 (แสดงใน toast ตามเดิม)
- Produces:
  - `type RegistrationSummary = { semester: number; academicYear: string; termCredits: number; inProgressCredits: number; maxCredits: number }` export จาก `src/lib/api.ts`
  - `api.enrollments.summary(): Promise<ApiEnvelope<{ summary: RegistrationSummary }>>`
  - `seatsLeft(section: Section): number` · `openSections(course: Course): Section[]` · `isCourseFull(course: Course): boolean` (มี section และทุก section เต็ม · วิชาที่ไม่มี section ไม่มีวันเต็ม)

- [ ] **Step 1: unit test ที่ fail** — `src/lib/course-seats.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { isCourseFull, openSections, seatsLeft } from './course-seats';
import type { Course, Section } from '@/types';

const section = (id: string, maxStudents: number, enrolledCount?: number, enrolledStudents: string[] = []): Section =>
  ({ id, sectionNumber: id, maxStudents, enrolledCount, enrolledStudents, schedule: [] });
const course = (sections: Section[]) => ({ id: 'c', sections } as unknown as Course);

describe('course seats', () => {
  it('uses the server count and falls back to visible rows', () => {
    expect(seatsLeft(section('01', 30, 29))).toBe(1);
    expect(seatsLeft(section('01', 2, undefined, ['a']))).toBe(1);
    expect(seatsLeft(section('01', 2, 5))).toBe(0);
  });
  it('lists only sections with seats; full only when every section is full', () => {
    const c = course([section('01', 1, 1), section('02', 1, 0)]);
    expect(openSections(c).map((s) => s.id)).toEqual(['02']);
    expect(isCourseFull(c)).toBe(false);
    expect(isCourseFull(course([section('01', 1, 1)]))).toBe(true);
    expect(isCourseFull(course([]))).toBe(false);
  });
});
```

- [ ] **Step 2: รันให้ fail** — `npx vitest run src/lib/course-seats.test.ts` → FAIL

- [ ] **Step 3: เขียน `src/lib/course-seats.ts`**

```ts
import type { Course, Section } from '@/types';

/** seats are counted by the server (dropped excluded); rows are only a fallback for old responses */
export const seatsLeft = (section: Section) =>
  Math.max(section.maxStudents - (section.enrolledCount ?? section.enrolledStudents.length), 0);

export const openSections = (course: Course) => course.sections.filter((s) => seatsLeft(s) > 0);

/** a course without sections has no seat limit */
export const isCourseFull = (course: Course) => course.sections.length > 0 && openSections(course).length === 0;
```

แล้วเพิ่ม `enrolledCount?: number;` ใน `Section` (`src/types/index.ts`) และใน `mapCourse` section mapper:

```ts
            enrolledCount: asNumber(section.enrolledCount, enrollments.filter((enrollment) => asString(asRecord(enrollment).sectionId) === asString(section.id)).length),
```

เพิ่ม unit test ใน `src/lib/live-mappers.test.ts`:

```ts
describe('mapCourse section seats', () => {
  it('keeps the per-section server count', () => {
    const course = mapCourse({ id: 'c1', sections: [{ id: 's1', number: '01', maxStudents: 30, enrolledCount: 12 }], enrollments: [] });
    expect(course.sections[0].enrolledCount).toBe(12);
  });
});
```

`src/lib/api.ts` ในกลุ่ม `enrollments`:

```ts
    summary: () => request<ApiEnvelope<{ summary: RegistrationSummary }>>("/enrollments/summary"),
```

และ export type `RegistrationSummary` ตาม Interfaces

- [ ] **Step 4: รัน unit ให้ผ่าน** — `npx vitest run src/lib/course-seats.test.ts src/lib/live-mappers.test.ts` → PASS

- [ ] **Step 5: E2E ที่ fail** — `e2e/course-registration.spec.ts`

```ts
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

async function token(request: APIRequestContext, email: string) {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;
}

/** a two-section course in chompoo's term, created by staff so the test never depends on seed courses */
async function twoSectionCourse(request: APIRequestContext) {
  const auth = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: auth })).json()).lecturers;
  const code = `E2E${Date.now().toString(36).toUpperCase()}`;
  const res = await request.post(`${API}/courses`, { headers: auth, data: {
    code, name: `Registration ${code}`, nameThai: `ทดสอบลงทะเบียน ${code}`, credits: 1, semester: 1, academicYear: "2569", year: 4,
    lecturerId: lecturers[0].id, status: "active",
    sections: [
      { number: "01", maxStudents: 5, schedule: [{ day: "saturday", startTime: "08:00", endTime: "09:00" }] },
      { number: "02", maxStudents: 5, schedule: [{ day: "sunday", startTime: "08:00", endTime: "09:00" }] },
    ],
  } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).course as { id: string; code: string; sections: Array<{ id: string; number: string }> };
}

test("student picks a section, confirms, sees API credits, and must confirm a drop", async ({ page, request }) => {
  const course = await twoSectionCourse(request);
  await login(page, "chompoo@student.showpro.local");
  const studentToken = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const headers = { Authorization: `Bearer ${studentToken}` };
  const before = (await (await request.get(`${API}/enrollments/summary`, { headers })).json()).summary;

  await page.goto("/courses");
  await expect(page.getByTestId("term-credits")).toHaveText(`${before.termCredits}/${before.maxCredits}`);
  await expect(page.locator("main").getByText(/^0%$/)).toHaveCount(0);

  await page.getByRole("tab", { name: /ลงทะเบียนเรียน|Register/ }).click();
  await page.getByTestId(`enroll-${course.code}`).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(course.code);
  await dialog.getByTestId("section-02").click();
  await dialog.getByTestId("confirm-enroll").click();
  await expect(dialog).toBeHidden();

  const enrolled = (await (await request.get(`${API}/enrollments`, { headers })).json()).enrollments
    .find((e: { courseId: string }) => e.courseId === course.id);
  expect(enrolled.sectionId).toBe(course.sections.find((s) => s.number === "02")!.id);
  await expect(page.getByTestId("term-credits")).toHaveText(`${before.termCredits + 1}/${before.maxCredits}`);

  await page.getByRole("tab", { name: /รายวิชาของฉัน|My Courses/ }).click();
  await page.getByTestId(`drop-${course.code}`).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(course.code);
  await confirm.getByRole("button", { name: /ยกเลิก|Cancel/ }).click();
  await expect(page.getByTestId(`drop-${course.code}`)).toBeVisible(); // still enrolled
  await page.getByTestId(`drop-${course.code}`).click();
  await page.getByRole("alertdialog").getByTestId("confirm-drop").click();
  await expect(page.getByTestId(`drop-${course.code}`)).toHaveCount(0);
  await expect(page.getByTestId("term-credits")).toHaveText(`${before.termCredits}/${before.maxCredits}`);
});
```

> chompoo อยู่เทอม 1/2569 (seed) · ชื่อแท็บมาจาก `t.coursesPage.myCourses`/`registerTab` = "รายวิชาของฉัน"/"ลงทะเบียนเรียน" · `GET /lecturers` (system.routes.ts) ส่ง `id` = LecturerProfile id ตามที่ Courses.tsx ใช้ · วิชาที่ E2E สร้างจะค้างอยู่ใน dev DB (chompoo ถอนแล้ว) — ยอมรับได้ บันทึกลง ledger

- [ ] **Step 6: รันให้ fail** — รีสตาร์ต backend dev แล้ว `npx playwright test e2e/course-registration.spec.ts` → FAIL (ไม่มี `term-credits` / dialog)

- [ ] **Step 7: แก้ Courses.tsx** (เพิ่ม import `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` จาก `@/components/ui/alert-dialog`, `RadioGroup, RadioGroupItem` จาก `@/components/ui/radio-group`, `{ isCourseFull, openSections, seatsLeft }` จาก `@/lib/course-seats`, `type RegistrationSummary` จาก `@/lib/api`)

  1. **state + โหลด summary** (นักศึกษาเท่านั้น):

  ```tsx
  const [summary, setSummary] = React.useState<RegistrationSummary | null>(null);
  const [pendingEnroll, setPendingEnroll] = React.useState<CourseRow | null>(null);
  const [pendingSectionId, setPendingSectionId] = React.useState('');
  const [pendingDrop, setPendingDrop] = React.useState<Course | null>(null);

  const reloadStudentData = React.useCallback(async () => {
    const [coursesResponse, enrollmentsResponse, summaryResponse] = await Promise.all([
      api.courses.list(),
      api.enrollments.list(),
      api.enrollments.summary(),
    ]);
    setCourses(coursesResponse.courses.map(mapCourse));
    setEnrolledCourses(enrollmentsResponse.enrollments.map((item, index) => mapCourse(asRecord(item).course, index)));
    setSummary(summaryResponse.summary);
  }, []);
  ```

  ใน effect โหลดครั้งแรกของนักศึกษา เพิ่ม `api.enrollments.summary()` เป็นตัวที่สามใน `Promise.allSettled` แล้ว `setSummary(... .value.summary)` ถ้า fulfilled (ถ้าไม่ได้ให้เป็น `null`) · `enrollCourse`/`dropCourse` ให้เรียก `reloadStudentData()` แทนโค้ดโหลดซ้ำเดิม

  2. **ตัวกรองวิชาเทอมนี้** — แทน `studentSemester` เดิม:

  ```tsx
  // the term comes from the API summary (the same term the backend enforces), not from the cached login profile
  const visibleCourses = user?.role === 'student'
    ? courses.filter(c => !!summary && c.status === 'active' && c.semester === summary.semester && String(c.academicYear) === summary.academicYear)
    : courses;
  ```

  ลบ `studentProfile`/`studentSemester` ถ้าไม่มีที่อื่นใช้แล้ว

  3. **หน่วยกิต** — ลบ `creditProgress` ที่หาร 22 และ `totalCredits` ฝั่งนักศึกษา แล้วใช้:

  ```tsx
  const creditProgress = summary ? Math.min((summary.termCredits / summary.maxCredits) * 100, 100) : 0;
  ```

  การ์ดหน่วยกิต (บริเวณบรรทัด 803–820) สำหรับนักศึกษา: ตัวเลขใหญ่เป็น `<span data-testid="term-credits">{summary ? `${summary.termCredits}/${summary.maxCredits}` : '-'}</span>` และคำบรรยาย `language === 'th' ? `หน่วยกิตเทอม ${summary.semester}/${summary.academicYear} (สูงสุด ${summary.maxCredits})` : `Credits in term ${summary.semester}/${summary.academicYear} (max ${summary.maxCredits})`` แทน `t.coursesPage.maxCredits` · role อื่นใช้ผลรวม `visibleCourses` ตามเดิม แต่ไม่มีหลอดเทียบ 22

  4. **ลบ progress ปลอม** — ลบบล็อก `{/* Progress */}` (บรรทัด ~931–944) ทั้งก้อน

  5. **ปุ่มถอน** (บรรทัด ~905) → `data-testid={`drop-${course.code}`}` และ `onClick={(e) => { e.stopPropagation(); setPendingDrop(course); }}` แล้วเพิ่ม:

  ```tsx
  <AlertDialog open={!!pendingDrop} onOpenChange={(open) => { if (!open) setPendingDrop(null); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{language === 'th' ? `ถอนวิชา ${pendingDrop?.code}?` : `Drop ${pendingDrop?.code}?`}</AlertDialogTitle>
        <AlertDialogDescription>
          {language === 'th'
            ? `${pendingDrop?.nameThai || pendingDrop?.name} จะถูกเอาออกจากรายวิชาของเทอมนี้ และหน่วยกิตจะคืนมา ${pendingDrop?.credits} หน่วยกิต`
            : `${pendingDrop?.name} will be removed from this term and ${pendingDrop?.credits} credits freed.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</AlertDialogCancel>
        <AlertDialogAction data-testid="confirm-drop" onClick={() => { if (pendingDrop) void dropCourse(pendingDrop.id); setPendingDrop(null); }}>
          {language === 'th' ? 'ถอนวิชา' : 'Drop'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  ```

  6. **ปุ่มลงทะเบียน** (บรรทัด ~984–996) → `data-testid={`enroll-${course.code}`}` · `disabled={enrolledCourses.some(c => c.id === course.id) || isCourseFull(course)}` · ป้าย "เต็มแล้ว" ใช้ `isCourseFull(course)` · ตัวเลขที่นั่งบนการ์ด (บรรทัด ~982) แสดง `ที่นั่งว่าง {course.sections.reduce((n, s) => n + seatsLeft(s), 0)}/{course.sections.reduce((n, s) => n + s.maxStudents, 0)}` และถ้าไม่มี section ให้แสดง `ไม่จำกัดที่นั่ง` / `No seat limit` · `onClick` → `{ e.stopPropagation(); setPendingEnroll(course); setPendingSectionId(openSections(course)[0]?.id ?? ''); }` · ส่วน `registrationMatches` (บรรทัด ~241) และ dialog รายละเอียดวิชา (บรรทัด ~1041) เปลี่ยนจาก `sections?.[0]?.maxStudents || 60` ไปใช้ `seatsLeft`/`isCourseFull` ให้หมด (grep `|| 60` ในไฟล์ต้องไม่เหลือฝั่งที่นั่งของนักศึกษา)

  7. **dialog ลงทะเบียน**:

  ```tsx
  <Dialog open={!!pendingEnroll} onOpenChange={(open) => { if (!open) setPendingEnroll(null); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{language === 'th' ? `ลงทะเบียน ${pendingEnroll?.code}` : `Register ${pendingEnroll?.code}`}</DialogTitle>
        <DialogDescription>
          {pendingEnroll && summary && (language === 'th'
            ? `${pendingEnroll.credits} หน่วยกิต · หลังลงจะมี ${summary.termCredits + pendingEnroll.credits}/${summary.maxCredits} หน่วยกิตในเทอมนี้`
            : `${pendingEnroll.credits} credits · ${summary.termCredits + pendingEnroll.credits}/${summary.maxCredits} credits this term after registering`)}
        </DialogDescription>
      </DialogHeader>
      {pendingEnroll && pendingEnroll.sections.length > 0 && (
        <RadioGroup value={pendingSectionId} onValueChange={setPendingSectionId}>
          {pendingEnroll.sections.map((s) => (
            <Label key={s.id} data-testid={`section-${s.sectionNumber}`} className="flex items-center gap-3 rounded-xl border p-3">
              <RadioGroupItem value={s.id} disabled={seatsLeft(s) === 0} />
              <span className="font-medium">{language === 'th' ? `ตอน ${s.sectionNumber}` : `Section ${s.sectionNumber}`}</span>
              <span className="text-sm text-slate-500">{s.schedule.map((slot) => `${slot.dayThai || slot.day} ${slot.startTime}–${slot.endTime}`).join(', ')}</span>
              <span className="ml-auto text-sm">{language === 'th' ? `ว่าง ${seatsLeft(s)}/${s.maxStudents}` : `${seatsLeft(s)}/${s.maxStudents} free`}</span>
            </Label>
          ))}
        </RadioGroup>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => setPendingEnroll(null)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
        <Button
          data-testid="confirm-enroll"
          disabled={!pendingEnroll || (pendingEnroll.sections.length > 0 && !pendingSectionId)}
          onClick={() => { if (pendingEnroll) void enrollCourse(pendingEnroll, pendingSectionId || undefined); setPendingEnroll(null); }}
        >
          {language === 'th' ? 'ยืนยันลงทะเบียน' : 'Confirm'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  ```

  และ `enrollCourse` เปลี่ยนเป็น `async (course: CourseRow, sectionId?: string)` ส่ง `...(sectionId ? { sectionId } : {})` (ไม่หยิบ `sections[0]` เองอีก) · error จาก API ยังแสดงใน `toast.error(error.message)` ตามเดิม


- [ ] **Step 8: dashboard** — `StudentDashboard.tsx` และ `PersonalDashboard.tsx`: โหลด `api.enrollments.summary()` คู่กับข้อมูลเดิม (ใส่ใน `Promise.allSettled` ที่มีอยู่) แล้วส่ง `registeredCredits={summary?.inProgressCredits ?? 0}` · `DegreeProgressCard` เปลี่ยนป้ายเป็น `isTH ? 'กำลังเรียน' : 'In progress'` · ลบ `maxCredits` ออกจาก `th.ts`/`en.ts` ถ้าไม่มีที่อื่นใช้แล้ว (grep ก่อน)

- [ ] **Step 9: รันทั้งหมด** — รีสตาร์ต backend dev แล้ว:
  - `npx vitest run src/lib` → ผ่าน (มี `import-mapping.test.ts` ขึ้น "No test suite" อยู่แล้วแต่เดิม ไม่ใช่ของเรา)
  - `npx playwright test` → ผ่านทั้งหมด (เดิม 28 + ใหม่ 1)
  - `npm run build` → ผ่าน
  - `cd backend && npm test` → ผ่านทั้งหมด

- [ ] **Step 10: Commit** — ข้าม · Por อนุมัติแล้วค่อยแยก 2 ก้อน: backend (Task 1–3 + แผน) / frontend (Task 4 + E2E)

---

## นอกขอบเขต (บันทึกไว้ ไม่ทำในแผนนี้)

- F5 เช็คชื่อ (UTC/เวลาไทย, ตัวหาร, QR) — แผนถัดไป
- F3 หน้าตารางเรียนยังแสดงแค่ `sections[0]` และ `:30` หาย
- enrollment เก่าที่ `sectionId = null` ในวิชาที่มี section จะไม่ถูกนับในที่นั่ง (seed ไม่มีกรณีนี้)
- แก้ section ของวิชาที่มีคนลงแล้ว (`course.service.ts` ลบแล้วสร้างใหม่ → FK) — อยู่ในรายงาน `2-backend-academic.md` ข้อ course update
