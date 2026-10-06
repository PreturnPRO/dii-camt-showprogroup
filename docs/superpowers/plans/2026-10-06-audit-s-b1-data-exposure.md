# Audit S-b1: ปิดข้อมูลรั่วและสิทธิ์อาจารย์ (S4 + ownership) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ข้อมูลนักศึกษา (เกรด อีเมล เบอร์โทร คำร้อง บันทึกฝึกงาน นัดหมาย) เห็นได้เฉพาะคนที่มีสิทธิ์ และอาจารย์แตะได้เฉพาะวิชาของตัวเอง — โดยหน้าเว็บของคนที่มีสิทธิ์ยังทำงานเหมือนเดิม

**Architecture:** เพิ่มโมดูลกลาง `backend/src/services/access-policy.ts` (ใครเห็นข้อมูลนักศึกษาคนไหนได้ / ใครจัดการวิชาไหนได้ / ตัดข้อมูลตามผู้ขอ) แล้วให้ทุก handler ที่รั่วเรียกใช้ · หลักการ "ตัดข้อมูลตามคนที่ขอ" ไม่ตัดทิ้งทั้งหมด เพราะหน้าเว็บ ≥10 หน้าใช้ endpoint เดียวกัน

**Tech Stack:** Express 4, Prisma 6, Zod, Vitest + supertest (harness จาก S-a), Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` กลุ่ม S4 และ F1 · รายละเอียด `2-backend-academic.md` (CRITICAL ×2 แรก, HIGH attendance/schedule/profile/company GPA/course create), `3-backend-career-ops.md` (CRITICAL activities/internship/requests, HIGH appointments), `1-backend-auth-security.md` (MEDIUM directory/lecturers) · ยืนยันสดแล้ว 6/10/69: `GET /api/courses/:id` ไม่ login ได้อีเมล เบอร์ เกรดนักศึกษา

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก S-a `22a9904`) · ห้าม commit/push ระหว่างรัน — Por อนุมัติตอนจบ
- เทสต์ใช้ DB `showpro_main_test` เท่านั้น · dev ใช้ `showpro_main` · ห้ามแตะ `showpro` / `showpro_test`
- ไม่เพิ่ม migration ในแผนนี้
- นโยบายบริษัทเดิม (`getStudentProfilesHandler`): บริษัทไม่เห็นเกรดตัวเลข เห็นเป็นช่วง (`gpaBand`) · ไม่เห็นอีเมล/เบอร์นักศึกษา
- ห้ามเปลี่ยน shape ของ response สำหรับ STAFF/ADMIN (ใช้ข้อมูลเต็มเหมือนเดิม)
- ข้อความ error เป็นภาษาอังกฤษตามแบบเดิมของ backend

**Seed ที่เทสต์อ้างอิง:** narin สอน DII340 (alice A, bob B+) · mali สอน DII420 (alice A, chompoo C+) · advisor: alice→narin, bob→narin, chompoo→mali · company `talent@northernsoft.local` · มี activity 2, request 1, appointment 2, internship record 1 · รหัสผ่าน seed `Password123!`

## Review Focus

1. นักศึกษาที่ไม่ได้ลงวิชา เปิด `/courses/:id` → ต้องไม่เห็น enrollment ของใครเลย (ไม่ใช่แค่ตัดอีเมล) (Task 2)
2. อาจารย์ที่เป็น advisor แต่ไม่ได้สอน → ดู transcript/เกรดของ advisee ได้ · อาจารย์ที่ไม่ใช่ทั้งสองอย่าง → 403 (Task 3)
3. `/attendance/report` ไม่ส่ง courseId จากอาจารย์ → ต้องได้เฉพาะวิชาตัวเอง ไม่ใช่ทั้งระบบ (Task 4)
4. หน้า leaderboard กิจกรรมของนักศึกษายังแสดงชื่อคนอื่นได้ แต่ไม่มีอีเมล/เบอร์ (Task 5, E2E Task 8)
5. GET บันทึกฝึกงานของนักศึกษาที่ยังไม่มี record → 404 ไม่สร้าง record ใหม่ (Task 6)

---

### Task 1: โมดูล access-policy

**Files:** Create `backend/src/services/access-policy.ts`, Test `backend/tests/access-policy.test.ts`

**Interfaces — Produces:**
- `isStaffOrAdmin(role: Role): boolean`
- `canViewStudentRecord(user: {id: string; role: Role}, student: {id: string; userId: string; advisorId: string | null}): Promise<boolean>` — STUDENT ตัวเอง · STAFF/ADMIN · LECTURER ที่เป็น advisor หรือสอนวิชาที่ student ลงอยู่ (status ≠ dropped) · อื่น false
- `assertCanViewStudentRecord(user, student): Promise<void>` — throw `AppError(403, "You do not have access to this student's records")`
- `assertCourseManager(user, courseId: string): Promise<Course>` — STAFF/ADMIN ผ่าน · LECTURER ต้องเป็นเจ้าของวิชา · อื่น/ไม่ใช่เจ้าของ → 403 `"You can only manage your own courses"` · ไม่พบวิชา → 404
- `lecturerProfileIdOf(userId: string): Promise<string | null>`
- `PUBLIC_USER_SELECT = { id: true, name: true, nameThai: true, avatar: true }` (Prisma select)
- `gpaBand(value: number | null | undefined): string` (ย้ายมาจาก `students.controller.ts` ให้เป็นที่เดียว)

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { assertCourseManager, canViewStudentRecord, gpaBand } from "../src/services/access-policy";

const userOf = async (email: string) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: u.id, role: u.role };
};
const studentOf = async (email: string) =>
  prisma.studentProfile.findFirstOrThrow({ where: { user: { email } }, select: { id: true, userId: true, advisorId: true } });

describe("canViewStudentRecord", () => {
  it("student sees only themselves", async () => {
    expect(await canViewStudentRecord(await userOf("alice@student.showpro.local"), await studentOf("alice@student.showpro.local"))).toBe(true);
    expect(await canViewStudentRecord(await userOf("alice@student.showpro.local"), await studentOf("bob@student.showpro.local"))).toBe(false);
  });
  it("lecturer sees advisees and students in courses they teach, nobody else", async () => {
    const mali = await userOf("mali@showpro.local");
    expect(await canViewStudentRecord(mali, await studentOf("chompoo@student.showpro.local"))).toBe(true); // advisee
    expect(await canViewStudentRecord(mali, await studentOf("alice@student.showpro.local"))).toBe(true); // in DII420
    expect(await canViewStudentRecord(mali, await studentOf("bob@student.showpro.local"))).toBe(false);
  });
  it("company never sees academic records; staff and admin always do", async () => {
    const bob = await studentOf("bob@student.showpro.local");
    expect(await canViewStudentRecord(await userOf("talent@northernsoft.local"), bob)).toBe(false);
    expect(await canViewStudentRecord(await userOf("staff@showpro.local"), bob)).toBe(true);
    expect(await canViewStudentRecord(await userOf("admin@showpro.local"), bob)).toBe(true);
  });
});

describe("assertCourseManager", () => {
  it("lets the owning lecturer, staff and admin through and blocks others", async () => {
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    await expect(assertCourseManager(await userOf("narin@showpro.local"), dii340.id)).resolves.toMatchObject({ id: dii340.id });
    await expect(assertCourseManager(await userOf("staff@showpro.local"), dii340.id)).resolves.toBeTruthy();
    await expect(assertCourseManager(await userOf("mali@showpro.local"), dii340.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertCourseManager(await userOf("alice@student.showpro.local"), dii340.id)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("gpaBand", () => {
  it("maps GPAX to the company-visible band", () => {
    expect(gpaBand(3.8)).toBe("3.50+");
    expect(gpaBand(3.2)).toBe("3.00-3.49");
    expect(gpaBand(0)).toBe("not_disclosed");
    expect(gpaBand(null)).toBe("not_disclosed");
  });
});
```
> ก่อนรัน: ตรวจชื่อ property สถานะของ `AppError` ใน `src/utils/errors.ts` (ถ้าไม่ใช่ `statusCode` ให้แก้ matcher ให้ตรง)

- [ ] **Step 2: รัน → FAIL (module not found)** — `npx vitest run tests/access-policy.test.ts`

- [ ] **Step 3: เขียนโมดูล**

```ts
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";

type Viewer = { id: string; role: Role };
type StudentRef = { id: string; userId: string; advisorId: string | null };

export const PUBLIC_USER_SELECT = { id: true, name: true, nameThai: true, avatar: true } as const;

export const isStaffOrAdmin = (role: Role) => role === Role.STAFF || role === Role.ADMIN;

export const lecturerProfileIdOf = async (userId: string) =>
  (await prisma.lecturerProfile.findUnique({ where: { userId }, select: { id: true } }))?.id ?? null;

export const canViewStudentRecord = async (user: Viewer, student: StudentRef): Promise<boolean> => {
  if (isStaffOrAdmin(user.role)) return true;
  if (user.role === Role.STUDENT) return student.userId === user.id;
  if (user.role !== Role.LECTURER) return false;
  const lecturerId = await lecturerProfileIdOf(user.id);
  if (!lecturerId) return false;
  if (student.advisorId === lecturerId) return true;
  const teaches = await prisma.enrollment.count({
    where: { studentId: student.id, status: { not: "dropped" }, course: { lecturerId } },
  });
  return teaches > 0;
};

export const assertCanViewStudentRecord = async (user: Viewer, student: StudentRef) => {
  if (!(await canViewStudentRecord(user, student))) {
    throw new AppError(403, "You do not have access to this student's records");
  }
};

export const assertCourseManager = async (user: Viewer, courseId: string) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, "Course not found");
  if (isStaffOrAdmin(user.role)) return course;
  if (user.role === Role.LECTURER && course.lecturerId === (await lecturerProfileIdOf(user.id))) return course;
  throw new AppError(403, "You can only manage your own courses");
};

export const gpaBand = (value: number | null | undefined) => {
  const gpax = Number(value ?? 0);
  if (gpax >= 3.5) return "3.50+";
  if (gpax >= 3) return "3.00-3.49";
  if (gpax >= 2.5) return "2.50-2.99";
  if (gpax > 0) return "below 2.50";
  return "not_disclosed";
};
```
แล้วใน `students.controller.ts` ลบ `gpaBand` ภายใน `getStudentProfilesHandler` และ import จาก `../services/access-policy` (พฤติกรรมเดิม)

- [ ] **Step 4: รัน → PASS** · `npx vitest run` ทั้งชุด PASS · `npx tsc --noEmit` exit 0

---

### Task 2: วิชา — ตัดข้อมูลตามคนที่ขอ + ตารางสอน + อาจารย์สร้างวิชา

**Files:** Modify `backend/src/routes/academic.routes.ts` (GET `/courses`, `/courses/:id` เพิ่ม `optionalAuth`), `backend/src/controllers/academic.controller.ts` (`getCoursesHandler`, `getCourseByIdHandler`, `scheduleHandler`, `createCourseHandler`, `updateCourseHandler`), `backend/src/services/access-policy.ts` (เพิ่ม `scopeCourseForViewer`) · Test `backend/tests/courses-exposure.test.ts`

**Interfaces — Produces:** `scopeCourseForViewer<T extends { lecturerId: string; enrollments?: Array<{ studentId: string }>; lecturer?: { user?: unknown } }>(course: T, viewer: { id: string; role: Role; studentProfileId?: string | null; lecturerProfileId?: string | null } | null): T` —
- STAFF/ADMIN หรือ LECTURER เจ้าของวิชา → คืนเดิม
- STUDENT → `enrollments` เหลือเฉพาะของตัวเอง
- อื่น (ไม่ login / company / อาจารย์อื่น) → `enrollments: []` และใส่ `enrollmentCount: <จำนวนเดิม>`
- ทุกกรณีที่ไม่ใช่ STAFF/ADMIN: `lecturer.user` เหลือ `{ id, name, nameThai, avatar, email }` (ตัด phone, lastLogin) · enrollment ที่เหลือ ถ้ามี `student.user` ให้ตัดเหลือ `PUBLIC_USER_SELECT` + email (เฉพาะเจ้าของวิชาเห็นอีเมล — กรณีเจ้าของคืนเดิมอยู่แล้ว)
- `viewerContext(req): Promise<Viewer | null>` — อ่าน `req.user` แล้วหา `studentProfileId` / `lecturerProfileId` ครั้งเดียว

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/courses-exposure.test.ts`:

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const getCourse = (token?: string) => {
  const r = request(app).get("/api/courses/DII340");
  return token ? r.set("Authorization", `Bearer ${token}`) : r;
};
const text = (body: unknown) => JSON.stringify(body);

describe("GET /api/courses/:id", () => {
  it("anonymous sees the course but no enrolled students, emails, phones or grades", async () => {
    const res = await getCourse();
    expect(res.status).toBe(200);
    expect(res.body.course.code).toBe("DII340");
    expect(res.body.course.enrollments).toEqual([]);
    expect(res.body.course.enrollmentCount).toBe(2);
    expect(text(res.body)).not.toMatch(/@student\.showpro\.local|"phone"|letterGrade/);
  });

  it("a student sees only their own enrollment", async () => {
    const res = await getCourse(await loginAs("bob@student.showpro.local"));
    expect(res.body.course.enrollments).toHaveLength(1);
    expect(text(res.body)).not.toContain("alice@student.showpro.local");
  });

  it("company and a lecturer who does not teach the course see no enrollments", async () => {
    for (const email of ["talent@northernsoft.local", "mali@showpro.local"]) {
      const res = await getCourse(await loginAs(email));
      expect(res.body.course.enrollments).toEqual([]);
    }
  });

  it("the owning lecturer and staff still see the full class list", async () => {
    for (const email of ["narin@showpro.local", "staff@showpro.local"]) {
      const res = await getCourse(await loginAs(email));
      expect(res.body.course.enrollments).toHaveLength(2);
    }
  });
});

describe("GET /api/courses", () => {
  it("anonymous list carries no enrollment rows", async () => {
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(200);
    for (const c of res.body.courses) expect(c.enrollments).toEqual([]);
    expect(text(res.body)).not.toMatch(/letterGrade|"phone"/);
  });
});

describe("GET /api/courses/lecturer/schedule?lecturerId=", () => {
  it("a student gets the timetable without other students' enrollments or lecturer phone", async () => {
    const token = await loginAs("alice@student.showpro.local");
    const res = await request(app).get("/api/courses/lecturer/schedule?lecturerId=L001").set("Authorization", `Bearer ${token}`);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(text(res.body)).not.toMatch(/"phone"|letterGrade|bob@student/);
    }
  });
});

describe("lecturer course creation", () => {
  it("a lecturer cannot create a course for another lecturer or activate it", async () => {
    const token = await loginAs("narin@showpro.local");
    const mali = await request(app).get("/api/courses/DII420");
    const res = await request(app)
      .post("/api/courses")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: `T${Date.now()}`.slice(0, 10), name: "T", nameThai: "ที", credits: 3, semester: 1, academicYear: "2569", lecturerId: mali.body.course.lecturerId, status: "active" });
    expect(res.status).toBe(201);
    expect(res.body.course.lecturerId).not.toBe(mali.body.course.lecturerId);
    expect(res.body.course.status).toBe("pending");
  });
});
```
> ก่อนรัน: ตรวจ `courseCreateSchema` (`academic.schema.ts`) ว่าต้องมี field อะไรบ้าง แล้วเติม body ให้ผ่าน validation · ตรวจรหัส `lecturerId` ของ narin ใน seed แล้วแก้ `L001` ในเทสต์ schedule ให้เป็นรหัสจริง และเปลี่ยน `[200, 404]` เป็น `200`

- [ ] **Step 2: รัน → FAIL** (anonymous ได้ enrollment + อีเมล ฯลฯ)

- [ ] **Step 3: แก้โค้ด**
- `academic.routes.ts`: GET `/courses` และ `/courses/:id` ใส่ `optionalAuth` (import จาก `../lib/passport`) ก่อน validate
- `access-policy.ts` เพิ่ม `viewerContext` + `scopeCourseForViewer` ตาม Interfaces
- `getCoursesHandler`: `const viewer = await viewerContext(req); res.json({ success: true, courses: courses.map((c) => scopeCourseForViewer(c, viewer)) })`
- `getCourseByIdHandler`: แบบเดียวกัน
- `scheduleHandler` สาย `req.query.lecturerId`: ถ้าผู้ขอไม่ใช่ STAFF/ADMIN → คืน `lecturer` เป็น `{ id, lecturerId, department, position, user: { name, nameThai, avatar, email } }` และ `schedule` = courses ที่ map ผ่าน `scopeCourseForViewer`
- `createCourseHandler`: ถ้า LECTURER → `lecturerId = await lecturerProfileIdOf(currentUser.id)` และ `status = "pending"` เสมอ (ไม่อ่านจาก body)
- `updateCourseHandler`: ถ้า LECTURER → `delete req.body.status` และ `delete req.body.lecturerId` ก่อนส่งให้ `updateCourse`

- [ ] **Step 4: รัน → PASS** · ทั้งชุด PASS · tsc exit 0

---

### Task 3: ข้อมูลการเรียนของนักศึกษา (เกรด / transcript / stats / enrollments / โปรไฟล์)

**Files:** Modify `academic.controller.ts` (`getGradesHistoryHandler`, `getStudentTranscriptHandler`), `documents.controller.ts` (`getTranscript`), `students.controller.ts` (`getStudentStatsHandler`, `getStudentProfileHandler`, `getStudentProfileByIdHandler`), `enrollment.service.ts` (`getEnrollments`), `students.routes.ts` (`/students/profile/:id` เพิ่ม `optionalAuth`) · Test `backend/tests/student-records.test.ts`

**Interfaces — Consumes:** `assertCanViewStudentRecord`, `gpaBand` (Task 1) · **Produces:** `serializeStudentProfileForCompany(student)` = `serializeStudentProfile` โดยตัด `gpa, gpax, consent, internship, timeline` และเพิ่ม `gpaBand`

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const get = async (path: string, email: string) =>
  request(app).get(path).set("Authorization", `Bearer ${await loginAs(email)}`);

describe("grade history / transcript / stats", () => {
  const paths = ["/api/grades/history/65010002", "/api/student/transcript?studentId=65010002", "/api/students/stats?studentId=65010002", "/api/documents/transcript?studentId=65010002"];

  it.each(paths)("company is refused %s", async (p) => {
    expect((await get(p, "talent@northernsoft.local")).status).toBe(403);
  });

  it.each(paths)("a lecturer who neither advises nor teaches bob is refused %s", async (p) => {
    expect((await get(p, "mali@showpro.local")).status).toBe(403);
  });

  it.each(paths)("bob's advisor (who also teaches him) is allowed %s", async (p) => {
    expect((await get(p, "narin@showpro.local")).status).toBe(200);
  });

  it("another student is refused", async () => {
    expect((await get("/api/grades/history/65010002", "alice@student.showpro.local")).status).toBe(403);
  });
});

describe("GET /api/enrollments", () => {
  it("company gets 403", async () => {
    expect((await get("/api/enrollments", "talent@northernsoft.local")).status).toBe(403);
  });
  it("staff still gets everything", async () => {
    const res = await get("/api/enrollments", "staff@showpro.local");
    expect(res.status).toBe(200);
    expect(res.body.enrollments.length).toBeGreaterThanOrEqual(4);
  });
});

describe("student profile seen by a company", () => {
  it("never includes exact GPA, consent or internship details", async () => {
    const res = await get("/api/students/profile?studentId=65010001", "talent@northernsoft.local");
    if (res.status === 200) {
      expect(res.body.profile.gpax).toBeUndefined();
      expect(res.body.profile.gpa).toBeUndefined();
      expect(res.body.profile.consent).toBeUndefined();
      expect(res.body.profile.internship).toBeUndefined();
      expect(res.body.profile.gpaBand).toBeTruthy();
    } else {
      expect(res.status).toBe(403);
    }
  });

  it("/students/profile/:id now recognises the logged-in owner", async () => {
    const res = await get("/api/students/profile/65010001", "alice@student.showpro.local");
    expect(res.status).toBe(200);
    expect(res.body.profile.gpax).toBeDefined();
  });
});
```
> ก่อนรัน: ตรวจ path ของ transcript PDF ใน `documents.routes.ts` แล้วแก้ใน `paths` ให้ตรง · ตรวจ consent ของ alice ใน seed — ถ้า `allowDataSharing=false` เทสต์ company profile จะได้ 403 (ยอมรับได้ตามโค้ดที่เขียนไว้) ให้บันทึกในบัญชีว่าเทสต์นี้ผ่านสาย 403 หรือ 200

- [ ] **Step 2: รัน → FAIL**

- [ ] **Step 3: แก้โค้ด**
- `getGradesHistoryHandler`, `getStudentTranscriptHandler`, `getTranscript` (documents), `getStudentStatsHandler`: หลังได้ `student` เรียก `await assertCanViewStudentRecord(currentUser, student)` (ลบเช็ค STUDENT เดิมที่ซ้ำ)
- `getEnrollments`: เพิ่มก่อน `else`: `else if (currentUser.role === Role.COMPANY) { throw new AppError(403, "Companies cannot list enrollments"); }`
- `students.controller.ts`: เพิ่ม `serializeStudentProfileForCompany` · `getStudentProfileHandler` ถ้าผู้ขอเป็น COMPANY (และผ่านเงื่อนไข consent เดิม) ใช้ serializer นี้ · `getStudentProfileByIdHandler` สาย `canViewCompanyData` ใช้ serializer นี้
- `students.routes.ts`: `/students/profile/:id` ใส่ `optionalAuth` ก่อน `validate`

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

---

### Task 4: เช็คชื่อ — อาจารย์แตะได้เฉพาะวิชาตัวเอง

**Files:** Modify `academic.controller.ts` (`getAttendanceReportHandler`, `attendanceCheckInHandler`, `getAttendanceSummaryHandler`, `getStudentAttendanceHistoryHandler`) · Test `backend/tests/attendance-ownership.test.ts`

**Interfaces — Consumes:** `assertCourseManager`, `lecturerProfileIdOf`, `isStaffOrAdmin` (Task 1)

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

let mali: string;
let narin: string;
let dii340: string;
let bobEnrollment: string;
let bobProfile: string;

beforeAll(async () => {
  mali = await loginAs("mali@showpro.local");
  narin = await loginAs("narin@showpro.local");
  dii340 = (await prisma.course.findFirstOrThrow({ where: { code: "DII340" } })).id;
  const e = await prisma.enrollment.findFirstOrThrow({ where: { courseId: dii340, student: { user: { email: "bob@student.showpro.local" } } } });
  bobEnrollment = e.id;
  bobProfile = e.studentId;
});

describe("attendance ownership", () => {
  it("another lecturer cannot read the summary of DII340", async () => {
    const res = await request(app).get(`/api/attendance/summary/${dii340}`).set("Authorization", `Bearer ${mali}`);
    expect(res.status).toBe(403);
  });

  it("another lecturer cannot mark attendance on a DII340 enrollment", async () => {
    const res = await request(app).post("/api/attendance/check-in").set("Authorization", `Bearer ${mali}`).send({ enrollmentId: bobEnrollment, date: "2026-10-01T00:00:00.000Z", status: "absent" });
    expect(res.status).toBe(403);
  });

  it("another lecturer cannot read a DII340 student's history", async () => {
    const res = await request(app).get(`/api/attendance/history/${dii340}/${bobProfile}`).set("Authorization", `Bearer ${mali}`);
    expect(res.status).toBe(403);
  });

  it("the report without courseId only contains the lecturer's own courses", async () => {
    await request(app).post("/api/attendance/check-in").set("Authorization", `Bearer ${narin}`).send({ enrollmentId: bobEnrollment, date: "2026-10-02T00:00:00.000Z", status: "present" });
    const res = await request(app).get("/api/attendance/report").set("Authorization", `Bearer ${mali}`);
    expect(res.status).toBe(200);
    for (const row of res.body.attendance) expect(row.enrollment.courseId).not.toBe(dii340);
  });

  it("the owning lecturer can still do all of it", async () => {
    expect((await request(app).get(`/api/attendance/summary/${dii340}`).set("Authorization", `Bearer ${narin}`)).status).toBe(200);
    expect((await request(app).get(`/api/attendance/history/${dii340}/${bobProfile}`).set("Authorization", `Bearer ${narin}`)).status).toBe(200);
  });
});
```
> ตรวจรูปแบบ `date` ที่ `attendanceCheckInSchema` รับ แล้วแก้ค่าใน body ให้ผ่าน validation

- [ ] **Step 2: รัน → FAIL**

- [ ] **Step 3: แก้โค้ด**
- `getAttendanceReportHandler`: `const currentUser = requireUser(req);` · ถ้า `req.query.courseId` → `await assertCourseManager(currentUser, String(req.query.courseId))` · ถ้าเป็น LECTURER เพิ่มเงื่อนไข `enrollment: { course: { lecturerId } }` ใน where (รวมกับ courseId/studentId เดิมด้วย `AND` ไม่ใช่ spread ที่ทับกัน — ของเดิม spread `enrollment` สองครั้งทับกันเป็นบั๊กอยู่แล้ว ให้รวมเป็น object เดียว)
- `attendanceCheckInHandler`: หา enrollment จาก `req.body.enrollmentId` (404 ถ้าไม่พบ) แล้ว `await assertCourseManager(currentUser, enrollment.courseId)` ก่อน upsert
- `getAttendanceSummaryHandler`: `await assertCourseManager(requireUser(req), courseIdStr)` ก่อน query
- `getStudentAttendanceHistoryHandler`: ถ้าไม่ใช่ STUDENT → `await assertCourseManager(currentUser, String(courseId))`

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

---

### Task 5: กิจกรรม — ไม่ login ไม่ได้ข้อมูล และตัดข้อมูลตามคนที่ขอ

**Files:** Modify `backend/src/routes/activities.routes.ts` (`/activities/upcoming` ใส่ `requireAuth`), `activities.controller.ts` (`getActivities`, `getUpcomingActivities`) · Test `backend/tests/activities-exposure.test.ts`

**Interfaces — Produces:** `scopeActivityForViewer(activity, viewer)` ใน `access-policy.ts` — LECTURER/STAFF/ADMIN → คืนเดิม · STUDENT → enrollments คงไว้ แต่ `student` เหลือ `{ id, user: { id, name, nameThai, avatar } }` (ใช้กับ leaderboard) · COMPANY → `enrollments: []` + `enrollmentCount`

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const text = (b: unknown) => JSON.stringify(b);

describe("activities exposure", () => {
  it("upcoming activities need a login", async () => {
    expect((await request(app).get("/api/activities/upcoming")).status).toBe(401);
  });

  it("a student sees other participants' names but no email, phone or academic data", async () => {
    const res = await request(app).get("/api/activities").set("Authorization", `Bearer ${await loginAs("alice@student.showpro.local")}`);
    expect(res.status).toBe(200);
    expect(text(res.body)).not.toMatch(/"email"|"phone"|"gpax"|"gpa"/);
  });

  it("a company sees no participants", async () => {
    const res = await request(app).get("/api/activities").set("Authorization", `Bearer ${await loginAs("talent@northernsoft.local")}`);
    for (const a of res.body.activities) expect(a.enrollments).toEqual([]);
  });

  it("staff still see the full participant list", async () => {
    const res = await request(app).get("/api/activities").set("Authorization", `Bearer ${await loginAs("staff@showpro.local")}`);
    expect(text(res.body)).toMatch(/@student\.showpro\.local/);
  });
});
```
> ถ้า seed ไม่มี enrollment ในกิจกรรมเลย เทสต์ "staff still see" จะ fail เพราะไม่มีข้อมูล ให้สร้าง `ActivityEnrollment` ของ alice ใน `beforeAll` ด้วย prisma ก่อน

- [ ] **Step 2: รัน → FAIL** · **Step 3:** ใส่ `requireAuth` ที่ route · ทั้งสอง handler map ผล `scopeActivityForViewer(a, viewer)` (viewer = `requireUser(req)`) · **Step 4:** PASS · ทั้งชุด · tsc

---

### Task 6: คำร้อง / นัดหมาย / บันทึกฝึกงาน

**Files:** Modify `support.controller.ts` (`getRequests`, `createRequestComment`, `getAppointments`, `updateAppointmentStatus`), `career.controller.ts` (`getInternshipLogsHandler`) · Test `backend/tests/support-exposure.test.ts`

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;

describe("requests", () => {
  it.each(["talent@northernsoft.local", "narin@showpro.local"])("%s cannot list student requests", async (email) => {
    expect((await request(app).get("/api/requests").set("Authorization", await as(email))).status).toBe(403);
  });
  it("a student who does not own the request cannot comment on it", async () => {
    const r = await prisma.request.findFirstOrThrow();
    const owner = await prisma.studentProfile.findUniqueOrThrow({ where: { id: r.studentId }, include: { user: true } });
    const other = owner.user.email === "bob@student.showpro.local" ? "alice@student.showpro.local" : "bob@student.showpro.local";
    const res = await request(app).post(`/api/requests/${r.id}/comment`).set("Authorization", await as(other)).send({ message: "hi" });
    expect(res.status).toBe(403);
  });
  it("staff still list all requests", async () => {
    expect((await request(app).get("/api/requests").set("Authorization", await as("staff@showpro.local"))).status).toBe(200);
  });
});

describe("appointments", () => {
  it("a company cannot list appointments", async () => {
    expect((await request(app).get("/api/appointments").set("Authorization", await as("talent@northernsoft.local"))).status).toBe(403);
  });
  it("a lecturer cannot update another lecturer's appointment", async () => {
    const appt = await prisma.appointment.findFirstOrThrow({ include: { lecturer: { include: { user: true } } } });
    const other = appt.lecturer.user.email === "mali@showpro.local" ? "narin@showpro.local" : "mali@showpro.local";
    const res = await request(app).patch(`/api/appointments/${appt.id}/status`).set("Authorization", await as(other)).send({ status: "cancelled" });
    expect(res.status).toBe(403);
  });
});

describe("internship logs", () => {
  it("a company not linked to the record and an unrelated lecturer are refused", async () => {
    expect((await request(app).get("/api/internship/logs?studentId=65010002").set("Authorization", await as("mali@showpro.local"))).status).toBe(403);
  });
  it("reading a student with no record returns 404 and creates nothing", async () => {
    const before = await prisma.internshipRecord.count();
    const res = await request(app).get("/api/internship/logs?studentId=65010003").set("Authorization", await as("staff@showpro.local"));
    expect([200, 404]).toContain(res.status);
    expect(await prisma.internshipRecord.count()).toBe(res.status === 404 ? before : before);
  });
});
```
> ก่อนรัน: ตรวจชื่อ field ข้อความใน `requestCommentSchema` และค่า status ที่ schema ของ appointment รับ แล้วแก้ body · ตรวจว่า internship record ใน seed เป็นของใคร แล้วเลือก `studentId` ในเทสต์ "no record" ให้เป็นคนที่ไม่มี record จริง (ต้องได้ 404) และแก้ assertion เป็น `expect(res.status).toBe(404)` · เพิ่มเทสต์ว่าบริษัทที่ผูกกับ record เดียวกันยังอ่านได้ (ถ้า seed มี companyId)

- [ ] **Step 2: รัน → FAIL**

- [ ] **Step 3: แก้โค้ด**
- `getRequests`: STUDENT → ของตัวเอง (เดิม) · STAFF/ADMIN → ทั้งหมด (เดิม) · อื่น → `throw new AppError(403, "You cannot view student requests")`
- `createRequestComment`: หลังหา `existingRequest` → ถ้าไม่ใช่ STAFF/ADMIN และ `existingRequest.student.userId !== currentUser.id` → 403
- `getAppointments`: เพิ่ม `else if (isStaffOrAdmin(currentUser.role))` สำหรับสายดูทั้งหมด · อื่น (COMPANY) → 403
- `updateAppointmentStatus`: หา appointment ก่อน (404) · ถ้า LECTURER และ `appointment.lecturer.userId !== currentUser.id` → 403
- `getInternshipLogsHandler`: หา record ด้วย `findUnique` เท่านั้น (ลบสาย `create`) · ถ้าไม่พบ: STUDENT ตัวเอง → คืน `internship: null` (200) · อื่น → 404 · ถ้าพบ: อนุญาต STUDENT เจ้าของ, STAFF/ADMIN, COMPANY ที่ `record.companyId` = company profile ของผู้ขอ, LECTURER ที่เป็น advisor ของนักศึกษา · อื่น 403
- หน้าเว็บที่อ่าน `internship` ต้องรับ `null` ได้ — ตรวจ `src/pages/Internships.tsx` และ `InternTracking.tsx` ว่าไม่ crash เมื่อเป็น `null` (แก้ด้วย optional chaining ถ้าจำเป็น)

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

---

### Task 7: รายชื่อผู้ใช้ / อาจารย์ / บริษัท — ไม่แจกอีเมล เบอร์โทรเกินจำเป็น

**Files:** Modify `system.controller.ts` (`getDirectoryUsersHandler`, `getLecturersHandler`, `getCompaniesHandler`) · Test `backend/tests/directory-exposure.test.ts`

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const get = async (path: string, email: string) => request(app).get(path).set("Authorization", `Bearer ${await loginAs(email)}`);

describe("directory PII", () => {
  it("students and companies never get phone numbers from the directory", async () => {
    for (const email of ["alice@student.showpro.local", "talent@northernsoft.local"]) {
      const res = await get("/api/directory/users", email);
      expect(res.status).toBe(200);
      for (const u of res.body.users) expect(u.phone ?? null).toBeNull();
    }
  });
  it("a company does not get student emails from the directory", async () => {
    const res = await get("/api/directory/users", "talent@northernsoft.local");
    for (const u of res.body.users.filter((x: { role: string }) => x.role === "STUDENT")) expect(u.email ?? null).toBeNull();
  });
  it("staff still get contact details", async () => {
    const res = await get("/api/directory/users", "staff@showpro.local");
    expect(res.body.users.some((u: { phone?: string }) => Boolean(u.phone))).toBe(true);
  });
});

describe("lecturers and companies lists", () => {
  it("a student does not receive advisees or phone numbers", async () => {
    const res = await get("/api/lecturers", "alice@student.showpro.local");
    const s = JSON.stringify(res.body);
    expect(s).not.toMatch(/"advisees"|"phone"|lastLogin/);
  });
  it("a student does not receive company login phones", async () => {
    const res = await get("/api/companies", "alice@student.showpro.local");
    expect(JSON.stringify(res.body)).not.toMatch(/"phone"|contactPersonPhone|lastLogin/);
  });
});
```

- [ ] **Step 2: รัน → FAIL**

- [ ] **Step 3: แก้โค้ด**
- `getDirectoryUsersHandler`: `const full = isStaffOrAdmin(currentUser.role);` · ใน map: `phone: full ? user.phone : null` · `email: full || currentUser.role === Role.LECTURER || user.role !== Role.STUDENT ? user.email : null` (ภายใน: อาจารย์ต้องติดต่อนักศึกษา; นักศึกษา/บริษัทไม่เห็นอีเมลนักศึกษาอื่น) · `companyProfile`: ถ้าไม่ full ตัด `contactPersonPhone`
- `getLecturersHandler`: ถ้าไม่ใช่ STAFF/ADMIN → `include: { user: { select: { id: true, name: true, nameThai: true, avatar: true, email: true } }, officeHours: true, courses: true }` (ไม่มี advisees)
- `getCompaniesHandler`: ถ้าไม่ใช่ STAFF/ADMIN → `user: { select: { id, name, nameThai, avatar, email } }` และ map ตัด `contactPersonPhone` ออกจากผล
- ตรวจหน้า `Messages.tsx`, `Appointments.tsx`, `Network.tsx` ว่าไม่ crash เมื่อ `phone`/`advisees` ไม่มี

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

---

### Task 8: หน้าเว็บของคนที่มีสิทธิ์ยังใช้งานได้ (E2E)

**Files:** Create `e2e/role-pages.spec.ts`

- [ ] **Step 1: เขียน E2E** — สำหรับแต่ละ role เข้าเว็บแล้วเปิดหน้าตามรายการ เก็บ response `/api/` ที่ได้ 4xx/5xx (ยกเว้นที่คาดไว้) และ `pageerror` · ต้องเป็น 0 · และตรวจเนื้อหาที่ต้องเห็นจริง:

```ts
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

const pages: Record<string, string[]> = {
  "alice@student.showpro.local": ["/dashboard", "/courses", "/schedule", "/grades", "/activities", "/requests", "/internships"],
  "narin@showpro.local": ["/dashboard", "/courses", "/grades", "/attendance", "/advisees", "/appointments"],
  "staff@showpro.local": ["/dashboard", "/courses", "/requests", "/students", "/users", "/activities-management"],
  "talent@northernsoft.local": ["/dashboard"],
};

for (const [email, routes] of Object.entries(pages)) {
  test(`${email} pages load without API errors or crashes`, async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`crash ${String(e).slice(0, 120)}`));
    page.on("response", (r) => {
      if (r.url().includes("/api/") && r.status() >= 400) problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^.*\/api/, "/api")}`);
    });
    await login(page, email);
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
    }
    expect(problems).toEqual([]);
  });
}

test("the owning lecturer still sees the class list of DII340", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.goto("/attendance");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Bob|บ๊อบ|65010002/).first()).toBeVisible();
});
```
> ก่อนรัน: ตรวจ path จริงของหน้าจัดการกิจกรรม/ฝึกงานใน `src/App.tsx` แล้วแก้รายการ route · **รัน spec นี้กับโค้ดก่อนแก้ (checkout เดิมไม่ได้ เพราะไม่ commit) — ให้รันหลัง Task 1 เสร็จแต่ก่อน Task 2 เพื่อบันทึก baseline ของ error ที่มีอยู่เดิม** ถ้า baseline มี 4xx/5xx เดิมอยู่แล้ว ให้ใส่เป็นรายการยกเว้นที่บันทึกในบัญชี (ห้ามยกเว้น 403 ที่เกิดจากแผนนี้)

- [ ] **Step 2: รันหลังทุก task** — `npx playwright test` → ผ่านทั้งหมด (รวม `auth-hardening` + `temp-credentials` ของ S-a) · `npm run build` สำเร็จ · frontend tsc ไม่มี error ใหม่ (baseline 3)

- [ ] **Step 3: ยืนยันสดกับ dev server** — `curl localhost:4000/api/courses/DII340` (ไม่ login) ต้องไม่มีอีเมล/เบอร์/เกรด
