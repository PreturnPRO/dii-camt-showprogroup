# Audit F5: เช็คชื่อตรงวัน ตรงเปอร์เซ็นต์ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** วันที่เช็คชื่อใช้วันตามเวลาไทยทุกทาง (กรอกเอง/QR) · เปอร์เซ็นต์นับตามนโยบาย · QR ไม่รับคนถอน ไม่ทับสถานะที่อาจารย์ตั้ง · บันทึกล้มแล้วหน้าเว็บบอกและย้อนสถานะ · ลิงก์ QR ไม่หาย token ตอน login · แจ้งเตือนนัดหมายตรงเวลาไทยและส่งครั้งเดียว

**Architecture:** backend: โมดูล pure `backend/src/services/attendance.ts` (`thaiDay`, `thaiDateTime`, `attendanceRate`, ชุดสถานะ) ใช้ทั้ง check-in, QR, summary, คำเตือน และแจ้งเตือนนัดหมาย · `sendDueAppointmentReminders(now)` แยกออกจาก setInterval เพื่อทดสอบได้ + คอลัมน์ `Appointment.reminderSentAt` (migration) · frontend: `src/lib/thai-date.ts` · หน้า Attendance มีสถานะ "ยังไม่เช็ค" · DashboardLayout ส่งปลายทางให้หน้า login

**Tech Stack:** Express 4, Prisma 6 (PostgreSQL), Zod, Vitest + supertest, React 18, Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` F5 · `2-backend-academic.md` (attendance: "QR check-ins key on server-local midnight…") · **การตัดสินของ Por 7/10/69:**
- เปอร์เซ็นต์ = (มา + สาย) ÷ (มา + สาย + ขาด) · ลา ไม่อยู่ในตัวหาร · วันที่ยังไม่ถูกเช็ค ไม่นับ · ไม่มีอะไรให้นับ = ไม่มีค่า (ไม่ใช่ 100%)
- QR ไม่ทับสถานะที่อาจารย์บันทึกไว้แล้ววันนั้น → 409
- เช็คชื่อได้ถึง "วันนี้" ตามเวลาไทยเท่านั้น ห้ามวันอนาคต
- แจ้งเตือนนัดหมาย: เวลาไทย + ส่งครั้งเดียวด้วย `reminderSentAt`

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `b1619d1`) · **ห้าม commit/push ระหว่างรัน** — Por อนุมัติตอนจบ
- เทสต์ backend ใช้ DB `showpro_main_test` (`cd backend && npm test` — reset + migrate เอง) · migration ใหม่ apply กับ dev `showpro_main` ด้วย `npx prisma migrate deploy` เท่านั้น (ห้าม `migrate reset`/`migrate dev` กับ dev) แล้ว `npx prisma generate` + รีสตาร์ต backend dev
- ⚠️ รีสตาร์ต backend dev ก่อน E2E ทุกครั้ง
- **รูปแบบวันที่เก็บ:** `AttendanceRecord.date` และ `Appointment.date` = เที่ยงคืน UTC ของวันปฏิทินไทย (`2026-10-07T00:00:00.000Z` = วันที่ 7 ต.ค. ไทย) — ตรงกับ seed เดิม (`new Date("2026-01-12")`)
- สถานะเช็คชื่อ: `present | late | leave | absent` เท่านั้น
- ข้อความ error ภาษาอังกฤษ · ข้อความไทยห้าม letter-spacing · ตัวเลขบนจอบอกหน่วย/ขอบเขต

**Seed:** narin สอน DII340 (alice, bob) · attendance seed วันที่ 2026-01-12/19 (alice, bob DII340) และ 2026-01-12/14 · รหัส `Password123!` · เทสต์ backend ให้สร้างวิชา/นักศึกษาใหม่ (helper แบบ F4 `enrollment-api.test.ts`)

## Review Focus

1. เช็คชื่อตอน 06:30 น. เวลาไทย (= 23:30 UTC วันก่อน) ต้องลงวันที่ไทย ไม่ใช่วันก่อน (Task 1, Task 2)
2. นักศึกษาที่มีแต่ "ลา" → เปอร์เซ็นต์ไม่มีค่า ไม่ใช่ 0% หรือ 100% และไม่โดนเตือน (Task 1, Task 2)
3. สแกน QR สองครั้งพร้อมกัน → 1 ครั้งสำเร็จ อีกครั้ง 409 ไม่ใช่ 500 (Task 2)
4. นัดหมาย 10:00 น. ไทย → เตือนช่วง 09:30–10:00 ไทย ครั้งเดียว ต่อให้ตัวจับเวลารันซ้ำหลายรอบ (Task 3)
5. บันทึกสถานะล้ม (เน็ตหลุด/403) → ปุ่มกลับเป็นสถานะเดิมและมีข้อความแจ้ง (Task 4)

---

### Task 1: โมดูลเวลาไทย + เปอร์เซ็นต์ (pure)

**Files:**
- Create: `backend/src/services/attendance.ts`, `backend/tests/attendance-rules.test.ts`

**Interfaces — Produces:**
- `ATTENDANCE_STATUSES = ["present", "late", "leave", "absent"] as const` · `type AttendanceStatus`
- `thaiDay(at: Date): Date` — เที่ยงคืน UTC ของวันปฏิทินไทย (UTC+7) ของ `at`
- `thaiDateTime(day: Date, hhmm: string): Date` — `day` = ค่าที่เก็บ (เที่ยงคืน UTC ของวันไทย), `hhmm` = "HH:MM" เวลาไทย → instant จริง
- `attendanceRate(statuses: string[]): { present: number; late: number; leave: number; absent: number; percentage: number | null }` — ปัด 1 ตำแหน่ง
- `ATTENDANCE_WARNING_PERCENT = 80`

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/attendance-rules.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { attendanceRate, thaiDateTime, thaiDay } from "../src/services/attendance";

describe("thaiDay", () => {
  it("uses the Thai calendar day", () => {
    expect(thaiDay(new Date("2026-10-06T23:30:00.000Z")).toISOString()).toBe("2026-10-07T00:00:00.000Z"); // 06:30 Thai, 7 Oct
    expect(thaiDay(new Date("2026-10-07T16:59:00.000Z")).toISOString()).toBe("2026-10-07T00:00:00.000Z"); // 23:59 Thai
    expect(thaiDay(new Date("2026-10-07T17:00:00.000Z")).toISOString()).toBe("2026-10-08T00:00:00.000Z"); // 00:00 Thai next day
    expect(thaiDay(new Date("2026-01-12")).toISOString()).toBe("2026-01-12T00:00:00.000Z"); // seed-style dates stay put
  });
});

describe("thaiDateTime", () => {
  it("turns a stored day and a Thai HH:MM into the real instant", () => {
    expect(thaiDateTime(new Date("2026-10-07T00:00:00.000Z"), "10:00").toISOString()).toBe("2026-10-07T03:00:00.000Z");
    expect(thaiDateTime(new Date("2026-10-07T00:00:00.000Z"), "06:30").toISOString()).toBe("2026-10-06T23:30:00.000Z");
  });
});

describe("attendanceRate", () => {
  it("late counts as attended, leave leaves the denominator", () => {
    expect(attendanceRate(["present", "late", "absent", "leave"])).toEqual({ present: 1, late: 1, leave: 1, absent: 1, percentage: 66.7 });
  });
  it("has no value when nothing counts", () => {
    expect(attendanceRate([]).percentage).toBeNull();
    expect(attendanceRate(["leave", "leave"]).percentage).toBeNull();
  });
  it("ignores unknown statuses", () => {
    expect(attendanceRate(["present", "here"]).percentage).toBe(100);
  });
});
```

- [ ] **Step 2: รันให้ fail** — `cd backend && npx vitest run tests/attendance-rules.test.ts` → FAIL (หาโมดูลไม่เจอ)

- [ ] **Step 3: เขียนโมดูล** — `backend/src/services/attendance.ts`

```ts
/** Attendance and appointment dates are stored as UTC midnight of the Thai (UTC+7) calendar day. */
export const ATTENDANCE_STATUSES = ["present", "late", "leave", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_WARNING_PERCENT = 80;

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;

export const thaiDay = (at: Date): Date => {
  const shifted = new Date(at.getTime() + THAI_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
};

export const thaiDateTime = (day: Date, hhmm: string): Date => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h || 0, m || 0) - THAI_OFFSET_MS);
};

/** owner decision 7/10/69: late = attended, leave is not in the denominator, unmarked days are not counted */
export const attendanceRate = (statuses: string[]) => {
  const count = (s: AttendanceStatus) => statuses.filter((x) => x === s).length;
  const present = count("present");
  const late = count("late");
  const leave = count("leave");
  const absent = count("absent");
  const counted = present + late + absent;
  return {
    present, late, leave, absent,
    percentage: counted > 0 ? Math.round(((present + late) / counted) * 1000) / 10 : null,
  };
};
```

- [ ] **Step 4: รันให้ผ่าน** — คำสั่งเดิม → PASS
- [ ] **Step 5: Commit** — ข้าม

---

### Task 2: endpoint เช็คชื่อ (กรอกเอง, QR, สรุป, คำเตือน)

**Files:**
- Modify: `backend/src/schemas/academic.schema.ts` (`attendanceCheckInSchema.status` → `z.enum(ATTENDANCE_STATUSES)` ไม่มี default)
- Modify: `backend/src/controllers/academic.controller.ts` — `attendanceCheckInHandler`, `qrCheckInHandler`, `checkAttendanceWarning`, `getAttendanceSummaryHandler`
- Create: `backend/tests/attendance-api.test.ts`

**Interfaces:**
- Consumes: Task 1 ทั้งหมด
- Produces:
  - `POST /attendance/check-in` body `{ enrollmentId, date, status }` — `status` ต้องอยู่ในชุด (400) · enrollment ที่ถอนแล้ว → 409 `"This student has dropped the course"` · วัน (หลัง `thaiDay`) เกินวันนี้ไทย → 400 `"Attendance cannot be recorded for a future date"` · บันทึกลง `thaiDay(date)`
  - `POST /attendance/sessions/check-in` — ถอนแล้วหรือไม่ได้ลง → 403 · มี record วันนี้ (ไทย) แล้ว: `present`/`late` → 409 `"You have already checked in for this course today"` · `absent`/`leave` → 409 `"Your lecturer has already recorded your attendance today"` · ใช้ `create` และ map P2002 → 409 ข้อความแรก
  - `GET /attendance/summary/:courseId` → `{ success, totalSessions, summary: [{ studentId, studentCode, name, present, late, leave, absent, unmarked, percentage: number | null }] }` — เฉพาะ enrollment ที่ไม่ถอน · `totalSessions` = จำนวนวันที่มีการเช็คอย่างน้อย 1 คน (เฉพาะ enrollment ที่ไม่ถอน) · `unmarked = totalSessions − จำนวน record ของคนนั้นในวันเหล่านั้น`
  - คำเตือน: คิดด้วย `attendanceRate` จาก record ของ enrollment นั้น · `percentage !== null && < 80` · enrollment ถอนแล้วไม่เตือน · กันซ้ำ "ต่อวิชา" ต่อสัปดาห์ (หา notification ที่ `title` ตรงกับ `Low Attendance Warning: <code>`)

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/attendance-api.test.ts`

```ts
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { thaiDay } from "../src/services/attendance";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const freshStudent = async () => {
  const email = uniqueEmail("att");
  const user = await prisma.user.create({
    data: {
      email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `A${uid()}`, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569" } },
    },
    include: { studentProfile: true },
  });
  return { profile: user.studentProfile!, userId: user.id, auth: await as(email) };
};

/** a narin course with one fresh student enrolled */
const narinClass = async () => {
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  const code = `A${uid()}`;
  const course = await prisma.course.create({ data: { code, name: code, nameThai: code, credits: 3, semester: 1, academicYear: "2569", year: 2, lecturerId: narin.id, status: "active" } });
  const s = await freshStudent();
  const enrollment = await prisma.enrollment.create({ data: { studentId: s.profile.id, courseId: course.id } });
  return { course, s, enrollment, narin: await as("narin@showpro.local") };
};

const mark = (auth: string, body: Record<string, unknown>) => request(app).post("/api/attendance/check-in").set("Authorization", auth).send(body);
const startQr = async (auth: string, courseId: string) =>
  (await request(app).post("/api/attendance/sessions").set("Authorization", auth).send({ courseId })).body.session.token as string;
const scan = (auth: string, token: string) => request(app).post("/api/attendance/sessions/check-in").set("Authorization", auth).send({ token });

afterEach(() => vi.useRealTimers());

describe("manual check-in", () => {
  it("stores the Thai calendar day and only known statuses", async () => {
    const { enrollment, narin } = await narinClass();
    const res = await mark(narin, { enrollmentId: enrollment.id, date: "2026-10-01T23:30:00.000Z", status: "late" }); // 06:30 Thai on 2 Oct
    expect(res.status).toBe(201);
    expect(new Date(res.body.attendance.date).toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect((await mark(narin, { enrollmentId: enrollment.id, date: "2026-10-02", status: "here" })).status).toBe(400);
  });

  it("refuses future days and dropped enrollments", async () => {
    const { enrollment, narin } = await narinClass();
    const tomorrow = new Date(thaiDay(new Date()).getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    expect((await mark(narin, { enrollmentId: enrollment.id, date: tomorrow, status: "leave" })).status).toBe(400);
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: "dropped" } });
    expect((await mark(narin, { enrollmentId: enrollment.id, date: "2026-10-01", status: "present" })).status).toBe(409);
  });
});

describe("QR check-in", () => {
  it("records today's Thai day", async () => {
    const { course, s, narin } = await narinClass();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T23:30:00.000Z")); // 06:30 Thai, 7 Oct
    const res = await scan(s.auth, await startQr(narin, course.id));
    expect(res.status).toBe(200);
    expect(new Date(res.body.attendance.date).toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });

  it("never overwrites what the lecturer recorded, and refuses dropped students", async () => {
    const { course, s, enrollment, narin } = await narinClass();
    await prisma.attendanceRecord.create({ data: { enrollmentId: enrollment.id, date: thaiDay(new Date()), status: "absent" } });
    const res = await scan(s.auth, await startQr(narin, course.id));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/lecturer/);
    expect((await prisma.attendanceRecord.findFirstOrThrow({ where: { enrollmentId: enrollment.id } })).status).toBe("absent");

    const other = await narinClass();
    await prisma.enrollment.update({ where: { id: other.enrollment.id }, data: { status: "dropped" } });
    expect((await scan(other.s.auth, await startQr(other.narin, other.course.id))).status).toBe(403);
  });

  it("two scans at once: one 200, one 409", async () => {
    const { course, s, narin } = await narinClass();
    const token = await startQr(narin, course.id);
    const results = await Promise.all([scan(s.auth, token), scan(s.auth, token)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });
});

describe("summary and warnings", () => {
  it("leave is outside the denominator, unmarked days are not absences, dropped students are left out", async () => {
    const { course, s, enrollment, narin } = await narinClass();
    const bob = await freshStudent();
    const bobEnrollment = await prisma.enrollment.create({ data: { studentId: bob.profile.id, courseId: course.id } });
    const gone = await freshStudent();
    const goneEnrollment = await prisma.enrollment.create({ data: { studentId: gone.profile.id, courseId: course.id, status: "dropped" } });
    const d = (day: string) => new Date(`2026-09-${day}`);
    await prisma.attendanceRecord.createMany({ data: [
      { enrollmentId: enrollment.id, date: d("01"), status: "present" },
      { enrollmentId: enrollment.id, date: d("02"), status: "late" },
      { enrollmentId: enrollment.id, date: d("03"), status: "absent" },
      { enrollmentId: enrollment.id, date: d("04"), status: "leave" },
      { enrollmentId: bobEnrollment.id, date: d("01"), status: "leave" },
      { enrollmentId: goneEnrollment.id, date: d("05"), status: "present" },
    ] });
    const res = await request(app).get(`/api/attendance/summary/${course.id}`).set("Authorization", narin);
    expect(res.body.totalSessions).toBe(4);
    const rows = Object.fromEntries(res.body.summary.map((r: { studentId: string }) => [r.studentId, r]));
    expect(rows[s.profile.id]).toMatchObject({ present: 1, late: 1, absent: 1, leave: 1, unmarked: 0, percentage: 66.7 });
    expect(rows[bob.profile.id]).toMatchObject({ leave: 1, unmarked: 3, percentage: null });
    expect(rows[gone.profile.id]).toBeUndefined();
  });

  it("warns per course: a warning for one course does not silence another", async () => {
    const a = await narinClass();
    const narinProfile = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
    const code2 = `A${uid()}`;
    const course2 = await prisma.course.create({ data: { code: code2, name: code2, nameThai: code2, credits: 3, semester: 1, academicYear: "2569", year: 2, lecturerId: narinProfile.id, status: "active" } });
    const e2 = await prisma.enrollment.create({ data: { studentId: a.s.profile.id, courseId: course2.id } });
    await mark(a.narin, { enrollmentId: a.enrollment.id, date: "2026-09-01", status: "absent" });
    await mark(a.narin, { enrollmentId: e2.id, date: "2026-09-01", status: "absent" });
    await vi.waitFor(async () => {
      const titles = (await prisma.notification.findMany({ where: { userId: a.s.userId, type: "ATTENDANCE_WARNING" } })).map((n) => n.title).sort();
      expect(titles).toEqual([`Low Attendance Warning: ${a.course.code}`, `Low Attendance Warning: ${code2}`].sort());
    });
  });

  it("a student with only leave is not warned", async () => {
    const a = await narinClass();
    await mark(a.narin, { enrollmentId: a.enrollment.id, date: "2026-09-01", status: "leave" });
    await new Promise((r) => setTimeout(r, 300));
    expect(await prisma.notification.count({ where: { userId: a.s.userId, type: "ATTENDANCE_WARNING" } })).toBe(0);
  });
});
```

> `vi.useFakeTimers({ toFake: ["Date"] })` ปลอมแค่ `Date` ไม่ปลอม setTimeout เพื่อให้ supertest/Prisma ทำงานปกติ · JWT ที่ออกก่อนปลอมเวลายังใช้ได้ (ปลอมไปข้างหน้าไม่กี่ชั่วโมง/วัน) — ถ้า token หมดอายุในเทสต์นี้ให้ login หลังตั้งเวลา และบันทึก ruling

- [ ] **Step 2: รันให้ fail** — `cd backend && npx vitest run tests/attendance-api.test.ts` → FAIL หลายข้อ (วันที่ UTC, status free text, QR ทับ, summary นับคนถอน, เตือนต่อ user ไม่ใช่ต่อวิชา)

- [ ] **Step 3: แก้ schema** — `academic.schema.ts`: import `ATTENDANCE_STATUSES` จาก `../services/attendance` แล้ว

```ts
export const attendanceCheckInSchema = z.object({
  enrollmentId: z.string().min(1),
  date: z.coerce.date(),
  status: z.enum(ATTENDANCE_STATUSES),
});
```

- [ ] **Step 4: แก้ `attendanceCheckInHandler`** — แทนส่วนก่อน upsert และใช้ `day` แทน `req.body.date`:

```ts
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: String(req.body.enrollmentId) },
    select: { courseId: true, status: true },
  });
  if (!enrollment) {
    throw new AppError(404, "Enrollment not found");
  }
  await assertCourseManager(requireUser(req), enrollment.courseId);
  if (enrollment.status === "dropped") {
    throw new AppError(409, "This student has dropped the course");
  }
  // owner decision 7/10/69: attendance is recorded up to today (Thai time), never ahead
  const day = thaiDay(req.body.date);
  if (day.getTime() > thaiDay(new Date()).getTime()) {
    throw new AppError(400, "Attendance cannot be recorded for a future date");
  }
```

แล้วใน upsert: `enrollmentId_date: { enrollmentId: req.body.enrollmentId, date: day }` และ `create.date: day`

- [ ] **Step 5: แก้ `qrCheckInHandler`** — ตั้งแต่หา enrollment ลงไปจนก่อน `emitToUser`:

```ts
  if (!enrollment || enrollment.status === "dropped") {
    throw new AppError(403, "You are not enrolled in this course");
  }

  const today = thaiDay(new Date());
  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: { enrollmentId_date: { enrollmentId: enrollment.id, date: today } },
  });
  // owner decision 7/10/69: a status the lecturer already set is never overwritten by a scan
  if (existingRecord) {
    throw new AppError(
      409,
      existingRecord.status === "present" || existingRecord.status === "late"
        ? "You have already checked in for this course today"
        : "Your lecturer has already recorded your attendance today",
    );
  }

  let record;
  try {
    record = await prisma.attendanceRecord.create({
      data: { enrollmentId: enrollment.id, date: today, status: "present", sessionId: session.id },
      include: { enrollment: { include: { student: { include: { user: true } }, course: true } } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "You have already checked in for this course today");
    }
    throw error;
  }
```

(import `Prisma` จาก `@prisma/client` และ `{ attendanceRate, ATTENDANCE_WARNING_PERCENT, thaiDay }` จาก `../services/attendance`)

- [ ] **Step 6: แก้ `checkAttendanceWarning`** — แทนตั้งแต่ `// Calculate unique days` ถึงก่อน `if (!recentWarning)`:

```ts
  if (enrollment.status === "dropped") return;

  const records = await prisma.attendanceRecord.findMany({ where: { enrollmentId: enrollment.id }, select: { status: true } });
  const { percentage } = attendanceRate(records.map((r) => r.status));
  if (percentage === null || percentage >= ATTENDANCE_WARNING_PERCENT) return;

  const title = `Low Attendance Warning: ${enrollment.course.code}`;
  // one warning per course per week
  const recentWarning = await prisma.notification.findFirst({
    where: {
      userId: enrollment.student.userId,
      type: "ATTENDANCE_WARNING",
      title,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
```

และใน `notification.create` ใช้ `title` ตัวแปรนี้ · ข้อความ `${percentage.toFixed(1)}%` และ `${ATTENDANCE_WARNING_PERCENT}%` แทนเลข 80 ตายตัว · ลบ `if (percentage < 80) {` ชั้นนอกและวงเล็บปิดที่เกินให้ครบ

- [ ] **Step 7: แก้ `getAttendanceSummaryHandler`** — ทั้งตัว:

```ts
export const getAttendanceSummaryHandler = asyncHandler(async (req, res) => {
  const courseIdStr = String(req.params.courseId);
  await assertCourseManager(requireUser(req), courseIdStr);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: courseIdStr, status: { not: "dropped" } },
    include: { student: { include: { user: true } } },
  });
  const records = await prisma.attendanceRecord.findMany({
    where: { enrollmentId: { in: enrollments.map((e) => e.id) } },
    select: { enrollmentId: true, date: true, status: true },
  });
  // a session = a Thai day on which at least one current student was marked
  const sessionDays = new Set(records.map((r) => r.date.toISOString()));
  const totalSessions = sessionDays.size;

  const summary = enrollments.map((enrollment) => {
    const own = records.filter((r) => r.enrollmentId === enrollment.id);
    return {
      studentId: enrollment.studentId,
      studentCode: enrollment.student.studentId,
      name: enrollment.student.user.name,
      ...attendanceRate(own.map((r) => r.status)),
      unmarked: totalSessions - own.length,
    };
  });

  res.json({ success: true, totalSessions, summary });
});
```

- [ ] **Step 8: รันให้ผ่าน** — `cd backend && npx vitest run tests/attendance-api.test.ts tests/attendance-ownership.test.ts` → PASS · แล้ว `npm test` ทั้งชุด (เทสต์เดิมที่ส่ง status อื่นนอกชุด ถ้ามี ให้อ่านก่อนแก้ และบันทึก ruling)
- [ ] **Step 9: Commit** — ข้าม

---

### Task 3: แจ้งเตือนนัดหมายตามเวลาไทย ส่งครั้งเดียว

**Files:**
- Modify: `backend/prisma/schema.prisma` (`Appointment.reminderSentAt DateTime?`)
- Create: `backend/prisma/migrations/20261007120000_appointment_reminder_sent/migration.sql`
- Modify: `backend/src/services/appointment.service.ts` (แยก `sendDueAppointmentReminders(now)`; `startAppointmentReminders` เรียกมันทุก 60 วินาที)
- Create: `backend/tests/appointment-reminders.test.ts`

**Interfaces — Produces:** `sendDueAppointmentReminders(now?: Date): Promise<number>` — คืนจำนวนนัดที่ส่งเตือนในรอบนี้ · ส่งเมื่อ `0 < เวลาเริ่ม − now ≤ 30 นาที`, `status === "confirmed"`, `reminderSentAt === null` · จองสิทธิ์ส่งด้วย `updateMany({ where: { id, reminderSentAt: null } })` ก่อนสร้าง notification

- [ ] **Step 1: migration + schema** — เพิ่มใน `model Appointment`: `reminderSentAt DateTime?` · ไฟล์ `migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
```

แล้ว `cd backend && npx prisma generate`

- [ ] **Step 2: เทสต์ที่ fail** — `backend/tests/appointment-reminders.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { sendDueAppointmentReminders } from "../src/services/appointment.service";

/** a confirmed bob↔narin appointment on 7 Oct 2026 (Thai) starting at the given Thai time */
const appointmentAt = async (startTime: string) => {
  const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  return prisma.appointment.create({
    data: { studentId: bob.id, lecturerId: narin.id, date: new Date("2026-10-07"), startTime, endTime: "23:59", location: `room-${Math.random()}`, purpose: "test", status: "confirmed" },
    include: { student: true },
  });
};
const remindersFor = (userId: string, location: string) =>
  prisma.notification.count({ where: { userId, type: "appointment", message: { contains: location } } });

describe("appointment reminders", () => {
  it("fires 30 minutes before the Thai start time, once, however often the timer runs", async () => {
    const appt = await appointmentAt("10:00"); // 03:00 UTC
    await sendDueAppointmentReminders(new Date("2026-10-07T02:00:00.000Z")); // 09:00 Thai: too early
    expect(await remindersFor(appt.student.userId, appt.location)).toBe(0);
    await sendDueAppointmentReminders(new Date("2026-10-07T02:31:00.000Z")); // 09:31 Thai
    await sendDueAppointmentReminders(new Date("2026-10-07T02:32:00.000Z"));
    await Promise.all([sendDueAppointmentReminders(new Date("2026-10-07T02:33:00.000Z")), sendDueAppointmentReminders(new Date("2026-10-07T02:33:00.000Z"))]);
    expect(await remindersFor(appt.student.userId, appt.location)).toBe(1);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } })).reminderSentAt).not.toBeNull();
  });

  it("an early-morning Thai appointment is found although its UTC time is the previous day", async () => {
    const appt = await appointmentAt("06:30"); // 2026-10-06T23:30Z
    await sendDueAppointmentReminders(new Date("2026-10-06T23:05:00.000Z"));
    expect(await remindersFor(appt.student.userId, appt.location)).toBe(1);
  });

  it("does not remind after the start or for unconfirmed appointments", async () => {
    const late = await appointmentAt("08:00"); // 01:00Z
    await sendDueAppointmentReminders(new Date("2026-10-07T01:10:00.000Z"));
    expect(await remindersFor(late.student.userId, late.location)).toBe(0);
    const pending = await appointmentAt("12:00");
    await prisma.appointment.update({ where: { id: pending.id }, data: { status: "pending" } });
    await sendDueAppointmentReminders(new Date("2026-10-07T04:40:00.000Z"));
    expect(await remindersFor(pending.student.userId, pending.location)).toBe(0);
  });
});
```

- [ ] **Step 3: รันให้ fail** — `cd backend && npx vitest run tests/appointment-reminders.test.ts` → FAIL (`sendDueAppointmentReminders` ไม่มี)

- [ ] **Step 4: เขียนโค้ด** — แทนตัวของ setInterval ใน `appointment.service.ts`:

```ts
const REMINDER_LEAD_MS = 30 * 60 * 1000;

/** Sends the 30-minute reminder once per confirmed appointment. Dates are Thai days, start times Thai HH:MM. */
export const sendDueAppointmentReminders = async (now: Date = new Date()) => {
  const today = thaiDay(now);
  const appointments = await prisma.appointment.findMany({
    where: {
      status: "confirmed",
      reminderSentAt: null,
      // the Thai day of "now" or the next one covers every start within 30 minutes
      date: { gte: today, lte: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
    },
    include: { student: { include: { user: true } }, lecturer: { include: { user: true } } },
  });

  let sent = 0;
  for (const appt of appointments) {
    const untilStart = thaiDateTime(appt.date, appt.startTime).getTime() - now.getTime();
    if (untilStart <= 0 || untilStart > REMINDER_LEAD_MS) continue;

    // claim the reminder first so two overlapping runs cannot both send it
    const claimed = await prisma.appointment.updateMany({ where: { id: appt.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claimed.count !== 1) continue;
    const minutes = Math.ceil(untilStart / 60000);

    await createNotification({
      userId: appt.student.userId,
      title: "Upcoming Appointment",
      titleThai: "การนัดหมายกำลังจะเริ่ม",
      message: `You have an appointment with ${appt.lecturer.user.name} in ${minutes} minutes at ${appt.location}.`,
      messageThai: `คุณมีการนัดหมายกับ ${appt.lecturer.user.nameThai} ในอีก ${minutes} นาที ที่ ${appt.location}`,
      type: "appointment",
      priority: "high",
      channels: ["in-app"],
      actionUrl: "/appointments",
    });
    await createNotification({
      userId: appt.lecturer.userId,
      title: "Upcoming Appointment",
      titleThai: "การนัดหมายกำลังจะเริ่ม",
      message: `You have an appointment with ${appt.student.user.name} in ${minutes} minutes at ${appt.location}.`,
      messageThai: `คุณมีการนัดหมายกับ ${appt.student.user.nameThai} ในอีก ${minutes} นาที ที่ ${appt.location}`,
      type: "appointment",
      priority: "high",
      channels: ["in-app"],
      actionUrl: "/appointments",
    });
    sent += 1;
  }
  return sent;
};

export const startAppointmentReminders = () => {
  if (reminderInterval) return reminderInterval;
  reminderInterval = setInterval(() => {
    sendDueAppointmentReminders().catch((err) => console.error("Failed to process appointment reminders", err));
  }, 60 * 1000);
  return reminderInterval;
};
```

(import `{ thaiDateTime, thaiDay }` จาก `./attendance` · ช่วงค้นหา `date` ต้องครอบนัดที่เริ่มหลังเที่ยงคืนไทยของวันพรุ่งนี้ภายใน 30 นาที — เทสต์ข้อ 06:30 ตรวจกรณีกลับกัน: now ยังเป็นวันไทยเดียวกันแล้ว)

- [ ] **Step 5: รันให้ผ่าน** — `cd backend && npx vitest run tests/appointment-reminders.test.ts` → PASS · `npm test` ทั้งชุด
- [ ] **Step 6: apply กับ dev** — `cd backend && npx prisma migrate deploy` (DATABASE_URL ของ dev จาก `.env`) → "1 migration applied" · `npx prisma migrate status` → up to date
- [ ] **Step 7: Commit** — ข้าม

---

### Task 4: หน้าเว็บ — วันที่ไทย, "ยังไม่เช็ค", บันทึกล้มต้องรู้, QR หลัง login

**Files:**
- Create: `src/lib/thai-date.ts`, `src/lib/thai-date.test.ts`
- Modify: `src/pages/Attendance.tsx`
- Modify: `src/components/layout/DashboardLayout.tsx` (ส่ง `state={{ from }}` ไปหน้า login)
- Modify: `src/pages/LoginPage.tsx` (กลับไป `from` ถ้าเป็น path ภายในที่ปลอดภัย)
- Create: `e2e/attendance.spec.ts`

**Interfaces:**
- Consumes: Task 2 (`summary[].percentage: number | null`, `unmarked`, `totalSessions`, error messages)
- Produces: `thaiToday(now?: Date): string` ("YYYY-MM-DD" ตามเวลาไทย) ใน `src/lib/thai-date.ts` · `loginRedirectTarget(state: unknown): string` ("/dashboard" ถ้าไม่มี/ไม่ปลอดภัย) ใน `src/lib/safe-url.ts` (คู่กับ `safeInternalPath`)

- [ ] **Step 1: unit test ที่ fail**

`src/lib/thai-date.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { thaiToday } from './thai-date';

describe('thaiToday', () => {
  it('uses the Thai calendar day', () => {
    expect(thaiToday(new Date('2026-10-06T23:30:00.000Z'))).toBe('2026-10-07');
    expect(thaiToday(new Date('2026-10-07T16:59:00.000Z'))).toBe('2026-10-07');
    expect(thaiToday(new Date('2026-10-07T17:00:00.000Z'))).toBe('2026-10-08');
  });
});
```

เพิ่มใน `src/lib/safe-url.test.ts`:

```ts
describe('loginRedirectTarget', () => {
  it('returns the page the user wanted, with its query', () => {
    expect(loginRedirectTarget({ from: { pathname: '/student/checkin', search: '?token=abc' } })).toBe('/student/checkin?token=abc');
  });
  it('falls back to the dashboard for missing, external or login targets', () => {
    expect(loginRedirectTarget(null)).toBe('/dashboard');
    expect(loginRedirectTarget({ from: { pathname: '//evil.example', search: '' } })).toBe('/dashboard');
    expect(loginRedirectTarget({ from: { pathname: '/login', search: '' } })).toBe('/dashboard');
  });
});
```

(เพิ่ม `loginRedirectTarget` ใน import ของไฟล์เทสต์)

- [ ] **Step 2: รันให้ fail** — `npx vitest run src/lib/thai-date.test.ts src/lib/safe-url.test.ts` → FAIL

- [ ] **Step 3: เขียน**

`src/lib/thai-date.ts`:

```ts
/** "YYYY-MM-DD" of the Thai calendar day; attendance days are always Thai days */
export const thaiToday = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
```

`src/lib/safe-url.ts` (ต่อท้าย):

```ts
/** where to go after login: the protected page the user asked for (with its query), never off-site */
export const loginRedirectTarget = (state: unknown): string => {
  const from = state && typeof state === 'object' ? (state as { from?: { pathname?: unknown; search?: unknown } }).from : undefined;
  const path = safeInternalPath(from?.pathname);
  if (!path || path === '/login') return '/dashboard';
  return `${path}${typeof from?.search === 'string' ? from.search : ''}`;
};
```

- [ ] **Step 4: รัน unit ให้ผ่าน** — คำสั่งเดิม → PASS

- [ ] **Step 5: E2E ที่ fail** — `e2e/attendance.spec.ts`

```ts
import { expect, test, type Page } from "@playwright/test";

const thaiToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function pickDII340(page: Page) {
  await page.locator("main").getByRole("combobox").first().click();
  await page.getByRole("option", { name: /DII340/ }).click();
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
}

test("attendance defaults to the Thai day, cannot go ahead, and shows unmarked students as unmarked", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.waitForURL("**/dashboard");
  await page.goto("/attendance");
  await pickDII340(page);
  const dateInput = page.locator("main input[type=date]");
  await expect(dateInput).toHaveValue(thaiToday());
  await expect(dateInput).toHaveAttribute("max", thaiToday());

  await dateInput.fill("2026-02-02"); // no seed attendance on this day
  await expect(page.getByTestId("unmarked-count")).not.toHaveText("0");
  await expect(page.getByTestId("absent-count")).toHaveText("0");
});

test("a failed save is reported and the row goes back", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.waitForURL("**/dashboard");
  await page.goto("/attendance");
  await pickDII340(page);
  await page.locator("main input[type=date]").fill("2026-02-02");
  const firstRow = page.getByTestId("attendance-row").first();
  await expect(firstRow).toHaveAttribute("data-status", "unmarked");
  await page.route("**/api/attendance/check-in", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, message: "boom" }) }));
  await firstRow.getByTestId("mark-late").click();
  await expect(page.getByText(/บันทึกการเช็คชื่อไม่สำเร็จ|Could not save attendance/)).toBeVisible();
  await expect(firstRow).toHaveAttribute("data-status", "unmarked");
});

test("a QR link opened before login keeps its token through the login page", async ({ page }) => {
  await page.goto("/student/checkin?token=not-a-real-token");
  await page.waitForURL("**/login");
  await login(page, "alice@student.showpro.local");
  await page.waitForURL("**/student/checkin?token=not-a-real-token");
  await expect(page.getByText(/Invalid or inactive session/)).toBeVisible();
});
```

> `StudentQRCheckIn` แสดง `error.message` ของ API อยู่แล้ว (`Invalid or inactive session`) · combobox แรกใน main คือ Select วิชา

- [ ] **Step 6: รันให้ fail** — รีสตาร์ต backend dev แล้ว `npx playwright test e2e/attendance.spec.ts` → FAIL ทั้ง 3 ข้อ

- [ ] **Step 7: แก้หน้าเว็บ**

  1. `DashboardLayout.tsx`: `import { Outlet, Navigate, useLocation } from 'react-router-dom';` · `const location = useLocation();` (ประกาศก่อน early return ตาม rules of hooks) · `return <Navigate to="/login" replace state={{ from: location }} />;`
  2. `LoginPage.tsx`: `import { useLocation, useNavigate } …` · `const location = useLocation();` · `navigate(loginRedirectTarget(location.state), { replace: true });` แทน `navigate('/dashboard')` (import จาก `@/lib/safe-url`)
  3. `Attendance.tsx`:
     - `AttendanceRow['status']` เพิ่ม `'unmarked'` · แถวที่ไม่มี record → `'unmarked'` (แทน `'absent'`)
     - รายการวิชา: อาจารย์ใช้ `api.courses.lecturerSchedule().then(r => r.schedule)` (วิชาของตัวเอง แบบเดียวกับ Courses.tsx) · staff/admin ใช้ `api.courses.list()` ตามเดิม — เดิมอาจารย์เห็นทุกวิชาในระบบและหน้าเลือกวิชาแรกซึ่งมักไม่ใช่ของตัวเอง
     - `const [date, setDate] = React.useState(thaiToday());` · `<Input type="date" max={thaiToday()} … />`
     - เพิ่ม `const unmarkedCount = attendanceRows.filter(row => row.status === 'unmarked').length;` · ป้ายนับบนแถบ (บรรทัด ~325–328) ใส่ `data-testid="present-count"`, `late-count`, `absent-count` บนตัวเลข และเพิ่มชิป `ยังไม่เช็ค {unmarkedCount}` / `Unmarked` พร้อม `data-testid="unmarked-count"` (ตัวเลขอยู่ใน `<span data-testid>` แยกจากป้าย)
     - แถวนักศึกษา: wrapper ของแถวใส่ `data-testid="attendance-row" data-status={row.status}` · ปุ่ม 4 ปุ่มใส่ `data-testid="mark-present|mark-late|mark-absent|mark-leave"`
     - `updateStatus`:

     ```tsx
     const updateStatus = async (row: AttendanceRow, status: Exclude<AttendanceRow['status'], 'unmarked'>) => {
         const previous = row.status;
         setAttendanceRows(current => current.map(item => item.enrollmentId === row.enrollmentId ? { ...item, status } : item));
         try {
             await api.attendance.checkIn({ enrollmentId: row.enrollmentId, date, status });
         } catch (error) {
             setAttendanceRows(current => current.map(item => item.enrollmentId === row.enrollmentId ? { ...item, status: previous } : item));
             toast.error(language === 'th' ? 'บันทึกการเช็คชื่อไม่สำเร็จ' : 'Could not save attendance', {
                 description: error instanceof Error ? error.message : undefined,
             });
         }
     };
     ```

     (เปลี่ยน `const { t } = useLanguage();` เป็น `const { t, language } = useLanguage();`)
     - realtime `handleCheckedIn`: อัปเดตเป็น `present` เฉพาะถ้า `date === thaiToday()` (QR บันทึกวันนี้เสมอ)
     - การ์ดสถิติด้านบน (บรรทัด ~259–262) ใช้ตัวนับเดียวกัน (absent = ขาดจริงเท่านั้น)
     - ตารางสรุป: `row.percentage === null` → แสดง `-` (Badge สีเทา) · ไม่งั้น `${row.percentage}%` สีตามเกณฑ์ 80 · เพิ่มคอลัมน์ `Unmarked` / `ยังไม่เช็ค` · หัวตารางหรือคำอธิบายใต้หัว modal: `คาบที่เช็คแล้ว ${totalSessions} · % = (มา+สาย) ÷ (มา+สาย+ขาด) ไม่นับลาและวันที่ยังไม่เช็ค` (เก็บ `totalSessions` จาก response ใน state)

- [ ] **Step 8: รันทั้งหมด** — รีสตาร์ต backend dev แล้ว:
  - `npx vitest run src/lib` → ผ่าน (`import-mapping.test.ts` "No test suite" เดิม)
  - `npx playwright test` → ผ่านทั้งหมด (เดิม 30 + ใหม่ 3)
  - `npm run build` → ผ่าน · `cd backend && npm test` → ผ่านทั้งหมด
- [ ] **Step 9: Commit** — ข้าม · Por อนุมัติแล้วแยก 2 ก้อน: backend+migration+เทสต์+แผน / frontend+E2E

---

## นอกขอบเขต

- นักศึกษายังไม่มีหน้าดูเปอร์เซ็นต์เข้าเรียนของตัวเอง (มีแค่ API history) — ไม่ใช่บั๊ก เป็นฟีเจอร์ที่ขาด
- QR ไม่มีการนับ "สาย" ตามเวลาที่สแกน
- Select "คาบ" (09:00 - 12:00 Lecture) เป็นค่าตายตัวที่ไม่ได้ใช้บันทึกอะไร — เรื่องของ F3 ตารางเรียน
- `GET /attendance/report` ยังคืน record ของคนที่ถอน (หน้าเว็บกรองด้วยรายชื่อ enrollment ที่ไม่ถอนอยู่แล้ว)
