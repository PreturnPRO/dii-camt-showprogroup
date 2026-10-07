# F3b: ย้ายคาบเฉพาะครั้ง (Class Moves) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** staff ย้ายคาบเฉพาะครั้งได้ อาจารย์ขอย้ายคาบของตัวเองแล้ว staff อนุมัติได้ ทุกคนเห็นการย้ายในตารางรายสัปดาห์ (มีวันที่จริง) และได้รับแจ้ง · ห้อง/อาจารย์ไม่ถูกจองซ้อน

**Architecture:** backend: model `ClassMove` (1 แถว = 1 การย้าย มีสถานะ) · `class-move-rules.ts` (pure: วันในสัปดาห์ตามวันไทย, แก้ได้ไหม, ช่วงเวลาที่ไม่ว่าง ณ วันหนึ่ง) · `class-move.service.ts` (เช็คชน, สร้าง/อนุมัติ/ปฏิเสธ/ถอน/ยกเลิก ใน transaction ที่ lock แถว Section, แจ้งเตือน) · `updateCourse` เรียกตัวกันการย้ายถาวร · frontend: `weekOf`/`weekOccurrences` ใน `timetable.ts` · `WeeklyTimetable` · `ClassMoveDialog` · หน้า `/schedule`, `/schedule-management`, dashboards

**Tech Stack:** Express 4, Prisma 6 (PostgreSQL), Zod, Vitest + supertest, React 18, Playwright

**Spec:** `docs/superpowers/specs/2026-10-07-class-moves-design.md` (commit `9c6f115`) — อ่านทั้งไฟล์ก่อนเริ่ม ตารางการตัดสินในข้อ 2 คือข้อบังคับ

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `9c6f115`) · **ห้าม commit/push ระหว่างรัน** — Por อนุมัติตอนจบ แยก 2 ก้อน backend (Task 1–4) / frontend (Task 5–6)
- migration ใหม่ apply กับ dev `showpro_main` ด้วย `npx prisma migrate deploy` เท่านั้น (ห้าม reset/dev) แล้ว `npx prisma generate` + รีสตาร์ต backend dev ก่อน E2E ทุกครั้ง
- วันที่ทั้งหมด = วันไทย เก็บเป็นเที่ยงคืน UTC (`thaiDay` จาก `backend/src/services/attendance.ts`) · API รับ/ส่งวันที่เป็น `YYYY-MM-DD` · เวลา "HH:MM"
- "วันนี้" = `thaiDay(new Date())` · "แก้ได้" = `min(originalDate, newDate) > วันนี้`
- error ภาษาอังกฤษ · 409 ใส่ `details` · ข้อความไทยห้าม letter-spacing · ตัวเลขบนจอบอกหน่วย/ขอบเขต
- เทสต์ backend สร้างวิชา/นักศึกษา/ห้องใหม่ทุกเทสต์ (ใช้ helper แบบ `backend/tests/enrollment-api.test.ts`) · วันที่ในเทสต์ใช้วันอนาคตไกล (ปี 2030) เพื่อไม่ชนกับ "วันนี้"
- E2E park วิชาที่สร้างไป academicYear 2500 ตอนจบ (แบบ `e2e/timetable.spec.ts` `park`)

**Seed:** narin สอน DII340 (section 01 จันทร์ 09:00–12:00, ห้อง DII-401) · mali สอน DII420 (พุธ 13:00–16:00, DII-502) · บริษัท `talent@northernsoft.local` · staff `staff@showpro.local` · admin `admin@showpro.local` · นักศึกษา alice/bob/chompoo · รหัส `Password123!`

## Review Focus

1. คาบที่ถูกย้ายออกจากห้อง ทำให้ห้องนั้นว่างสำหรับการย้ายอื่นในวันเดียวกัน (Task 1, Task 2)
2. ย้ายคาบไปวันที่ตกคนละเทอมกับวิชา (ย้ายได้ทุกวัน) แล้วห้องชนกับวิชาเทอมนั้น — spec นับคาบประจำเฉพาะเทอมของวิชาต้นทาง ต้องบันทึกเป็นข้อจำกัดที่รู้แล้ว (Task 2)
3. `GET /class-moves` ของนักศึกษาไม่เห็นคำขอที่ `pending` หรือการย้ายของ section ที่ไม่ได้ลง (Task 2)
4. ฟอร์มส่งล้ม (409 เพราะคนอื่นจองห้องไปก่อน) → dialog ไม่ปิด ข้อมูลยังอยู่ และขึ้นสาเหตุ (Task 6)
5. ตารางรายสัปดาห์ของสัปดาห์ที่มีคาบย้ายเข้ามาจากสัปดาห์อื่น ต้องแสดงคาบนั้น แม้คาบประจำของสัปดาห์นั้นจะไม่มีวิชานั้น (Task 5)

---

### Task 1: migration + กฎ pure

**Files:**
- Modify: `backend/prisma/schema.prisma` (model `ClassMove` + relation ใน `Section` และ `Facility`)
- Create: `backend/prisma/migrations/20261007140000_class_moves/migration.sql`
- Create: `backend/src/services/class-move-rules.ts`, `backend/tests/class-move-rules.test.ts`

**Interfaces — Produces:**
- `MOVE_STATUSES = ["pending","approved","rejected","withdrawn","cancelled"] as const` · `ACTIVE_MOVE_STATUSES = ["pending","approved"]`
- `parseDay(value: string): Date | null` — "YYYY-MM-DD" → เที่ยงคืน UTC, null ถ้ารูปแบบ/วันที่ผิด
- `formatDay(d: Date): string` — "YYYY-MM-DD"
- `weekdayOf(day: Date): string` — "monday".."sunday" ของวันไทย (day = เที่ยงคืน UTC)
- `toMinutes(hhmm: string): number | null` · `fromMinutes(min: number): string`
- `editable(move: { originalDate: Date; newDate: Date }, today: Date): boolean`
- `type RegularSlots = { sectionId: string; label: string; slots: Slot[] }` (`Slot` จาก `enrollment-rules`)
- `type MoveLike = { id: string; sectionId: string; label: string; originalDate: Date; originalStart: string; originalEnd: string; newDate: Date; newStart: string; newEnd: string }`
- `busyOn(day: Date, regular: RegularSlots[], approvedMoves: MoveLike[], ignoreMoveId?: string): Array<{ start: number; end: number; label: string }>` — คาบประจำของวันในสัปดาห์นั้น − ที่ย้ายออกจากวันนั้น + ที่ย้ายเข้าวันนั้น
- `clashesWith(busy, start, end)` — รายการที่ทับ (ขอบชนพอดีไม่นับ)

- [ ] **Step 1: schema + migration**

ใน `schema.prisma` เพิ่ม model ตาม spec ข้อ 3 (คัดลอกทั้งก้อน) และเพิ่ม `classMoves ClassMove[]` ใน `model Section` และ `model Facility`

`migration.sql`:

```sql
-- CreateTable
CREATE TABLE "ClassMove" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "originalStart" TEXT NOT NULL,
    "originalEnd" TEXT NOT NULL,
    "newDate" TIMESTAMP(3) NOT NULL,
    "newStart" TEXT NOT NULL,
    "newEnd" TEXT NOT NULL,
    "facilityId" TEXT,
    "room" TEXT,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassMove_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClassMove_sectionId_originalDate_idx" ON "ClassMove"("sectionId", "originalDate");
CREATE INDEX "ClassMove_newDate_idx" ON "ClassMove"("newDate");
ALTER TABLE "ClassMove" ADD CONSTRAINT "ClassMove_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMove" ADD CONSTRAINT "ClassMove_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

แล้ว `cd backend && npx prisma validate && npx prisma generate` · ตรวจว่า SQL ตรงกับที่ Prisma จะสร้าง: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$TEST_DATABASE_URL" --script` ต้องว่าง (ถ้าใช้ shadow DB ไม่ได้ ให้ข้ามและบันทึก ruling — global-setup ของเทสต์จะ migrate reset ฐานเทสต์และฟ้องถ้า SQL ผิด)

- [ ] **Step 2: เทสต์ที่ fail** — `backend/tests/class-move-rules.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { busyOn, clashesWith, editable, formatDay, parseDay, weekdayOf } from "../src/services/class-move-rules";

const d = (s: string) => parseDay(s)!;

describe("days", () => {
  it("parses only real YYYY-MM-DD dates", () => {
    expect(formatDay(d("2030-09-16"))).toBe("2030-09-16");
    expect(parseDay("2030-02-30")).toBeNull();
    expect(parseDay("16/09/2030")).toBeNull();
  });
  it("knows the Thai weekday", () => {
    expect(weekdayOf(d("2030-09-16"))).toBe("monday");
    expect(weekdayOf(d("2030-09-22"))).toBe("sunday");
  });
});

describe("editable", () => {
  const today = d("2030-09-16");
  it("needs both days strictly after today", () => {
    expect(editable({ originalDate: d("2030-09-17"), newDate: d("2030-09-20") }, today)).toBe(true);
    expect(editable({ originalDate: d("2030-09-16"), newDate: d("2030-09-20") }, today)).toBe(false);
    expect(editable({ originalDate: d("2030-09-20"), newDate: d("2030-09-16") }, today)).toBe(false);
  });
});

describe("busyOn", () => {
  const regular = [
    { sectionId: "A", label: "AAA", slots: [{ day: "monday", startTime: "09:00", endTime: "12:00" }] },
    { sectionId: "B", label: "BBB", slots: [{ day: "wednesday", startTime: "13:00", endTime: "15:00" }] },
  ];
  const moveA = { id: "m1", sectionId: "A", label: "AAA", originalDate: d("2030-09-16"), originalStart: "09:00", originalEnd: "12:00", newDate: d("2030-09-18"), newStart: "09:00", newEnd: "12:00" };

  it("weekly classes minus moved out plus moved in", () => {
    expect(busyOn(d("2030-09-16"), regular, [moveA])).toEqual([]);
    expect(busyOn(d("2030-09-23"), regular, [moveA]).map((b) => b.label)).toEqual(["AAA"]);
    expect(busyOn(d("2030-09-18"), regular, [moveA]).map((b) => [b.label, b.start])).toEqual([["BBB", 780], ["AAA", 540]]);
  });

  it("can ignore the move being edited", () => {
    expect(busyOn(d("2030-09-16"), regular, [moveA], "m1").map((b) => b.label)).toEqual(["AAA"]);
  });

  it("touching edges are not a clash", () => {
    const busy = busyOn(d("2030-09-23"), regular, []);
    expect(clashesWith(busy, 12 * 60, 13 * 60)).toEqual([]);
    expect(clashesWith(busy, 11 * 60, 13 * 60).map((b) => b.label)).toEqual(["AAA"]);
  });
});
```

- [ ] **Step 3: รันให้ fail** — `cd backend && npx vitest run tests/class-move-rules.test.ts` → FAIL (หาโมดูลไม่เจอ)

- [ ] **Step 4: เขียน** — `backend/src/services/class-move-rules.ts`

```ts
import type { Slot } from "./enrollment-rules";

export const MOVE_STATUSES = ["pending", "approved", "rejected", "withdrawn", "cancelled"] as const;
export const ACTIVE_MOVE_STATUSES = ["pending", "approved"];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "YYYY-MM-DD" (a Thai calendar day) → UTC midnight, the storage form used by attendance and moves */
export const parseDay = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return date.getUTCMonth() === Number(m[2]) - 1 && date.getUTCDate() === Number(m[3]) ? date : null;
};

export const formatDay = (d: Date) => d.toISOString().slice(0, 10);
export const weekdayOf = (day: Date) => WEEKDAYS[day.getUTCDay()];

export const toMinutes = (hhmm: string): number | null => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};
export const fromMinutes = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** owner decision 7/10/69: a move can be changed until its original or new day arrives */
export const editable = (move: { originalDate: Date; newDate: Date }, today: Date) =>
  Math.min(move.originalDate.getTime(), move.newDate.getTime()) > today.getTime();

export type RegularSlots = { sectionId: string; label: string; slots: Slot[] };
export type MoveLike = {
  id: string; sectionId: string; label: string;
  originalDate: Date; originalStart: string; originalEnd: string;
  newDate: Date; newStart: string; newEnd: string;
};
export type Busy = { start: number; end: number; label: string };

/** what is taken on one day: weekly classes, minus classes moved away from that day, plus classes moved onto it */
export const busyOn = (day: Date, regular: RegularSlots[], approvedMoves: MoveLike[], ignoreMoveId?: string): Busy[] => {
  const weekday = weekdayOf(day);
  const moves = approvedMoves.filter((m) => m.id !== ignoreMoveId);
  const sameDay = (a: Date) => a.getTime() === day.getTime();
  const busy: Busy[] = [];
  for (const r of regular) {
    for (const slot of r.slots) {
      if (slot.day !== weekday) continue;
      const movedAway = moves.some((m) => m.sectionId === r.sectionId && sameDay(m.originalDate) && m.originalStart === slot.startTime);
      const start = toMinutes(slot.startTime);
      const end = toMinutes(slot.endTime);
      if (!movedAway && start !== null && end !== null) busy.push({ start, end, label: r.label });
    }
  }
  for (const m of moves) {
    const start = toMinutes(m.newStart);
    const end = toMinutes(m.newEnd);
    if (sameDay(m.newDate) && start !== null && end !== null) busy.push({ start, end, label: m.label });
  }
  return busy;
};

export const clashesWith = (busy: Busy[], start: number, end: number) => busy.filter((b) => Math.max(b.start, start) < Math.min(b.end, end));
```

และ `export` type `Slot` ใน `enrollment-rules.ts` ถ้ายังไม่ได้ export (มันถูก export อยู่แล้ว — `export type Slot`)

- [ ] **Step 5: รันให้ผ่าน** — คำสั่งเดิม → PASS · `cd backend && npm test` ทั้งชุด → ผ่าน (global-setup migrate reset ฐานเทสต์รวม migration ใหม่)
- [ ] **Step 6: Commit** — ข้าม

---

### Task 2: service + API สร้าง / เช็ค / อ่าน

**Files:**
- Create: `backend/src/schemas/class-move.schema.ts`, `backend/src/services/class-move.service.ts`, `backend/src/controllers/class-moves.controller.ts`, `backend/src/routes/class-moves.routes.ts`, `backend/tests/class-moves-api.test.ts`
- Modify: `backend/src/routes/index.ts` (`router.use(classMovesRoutes)`)

**Interfaces:**
- Consumes: Task 1 · `thaiDay` · `parseSlots` (`enrollment-rules`) · `getLecturerProfileByUserId`, `getStudentProfileByUserId` · `createNotification`, `createNotificationsForRole`
- Produces:
  - `moveInputSchema` = `{ sectionId: string; originalDate: "YYYY-MM-DD"; originalStart: "HH:MM"; newDate: "YYYY-MM-DD"; newStart: "HH:MM"; facilityId?: string; reason: string(min 1) }` · `moveCheckSchema` = เหมือนกันแต่ไม่มี `reason` · `moveRangeSchema` = `{ from: "YYYY-MM-DD"; to: "YYYY-MM-DD" }`
  - `checkMove(input, ignoreMoveId?)` → `{ roomClashes: Busy[]; lecturerClashes: Busy[]; studentClashes: Array<{ courseCode: string; count: number }>; resolved: { originalEnd: string; newEnd: string; facilityId: string; room: string | null } }` (โยน 400 ตามกฎ)
  - `serializeMove(move)` → `{ id, sectionId, sectionNumber, courseId, courseCode, courseName, originalDate, originalStart, originalEnd, newDate, newStart, newEnd, facilityId, room, status, reason, requestedBy: { id, name }, decisionNote }` (วันที่เป็น "YYYY-MM-DD")
  - `GET /api/class-moves?from&to` → `{ success, moves: SerializedMove[] }` · `POST /api/class-moves/check` → `{ success, roomClashes, lecturerClashes, studentClashes, newEnd, room }` (จาก `checkMoveFor`) · `POST /api/class-moves` → 201 `{ success, move, studentClashes }`

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/class-moves-api.test.ts` (helper ตัวเดียวกันจะใช้ต่อใน Task 3–4 — Task 3/4 ให้เพิ่ม `describe` ลงไฟล์นี้)

```ts
import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const staff = () => as("staff@showpro.local");

const freshRoom = async () => prisma.facility.create({ data: { code: `R${uid()}`, name: "Room", building: "TEST", room: uid(), type: "classroom", capacity: 40 } });

/** a fresh lecturer-owned course in 1/2569 with one section on Mondays 09:00–12:00 in a fresh room */
const freshClass = async (opts: { lecturer?: string; day?: string; start?: string; end?: string; facilityId?: string | null } = {}) => {
  const lecturer = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: opts.lecturer ?? "narin@showpro.local" } } });
  const room = opts.facilityId === null ? null : opts.facilityId ? { id: opts.facilityId } : await freshRoom();
  const code = `M${uid()}`;
  const course = await prisma.course.create({
    data: {
      code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 2, lecturerId: lecturer.id, status: "active",
      sections: { create: [{ number: "01", maxStudents: 30, facilityId: room?.id ?? null, room: room ? null : "Somewhere",
        schedule: [{ day: opts.day ?? "monday", startTime: opts.start ?? "09:00", endTime: opts.end ?? "12:00" }] }] },
    },
    include: { sections: true },
  });
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
```

> ทุกเทสต์ย้าย "ไป" วันที่ narin และ mali ว่าง (ศุกร์/พฤหัส/เสาร์/อังคาร) ยกเว้นข้อที่ตั้งใจให้ชน · คาบต้นทางวันจันทร์ 09:00 ของวิชาใหม่ชนกับ DII340 ของ narin ไม่ได้มีผล เพราะเช็คชนดูที่ "วันใหม่" เท่านั้น

- [ ] **Step 2: รันให้ fail** — `cd backend && npx vitest run tests/class-moves-api.test.ts` → FAIL (404)

- [ ] **Step 3: schema** — `backend/src/schemas/class-move.schema.ts`

```ts
import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");

export const moveCheckSchema = z.object({
  sectionId: z.string().min(1),
  originalDate: day,
  originalStart: time,
  newDate: day,
  newStart: time,
  facilityId: z.string().min(1).optional(),
});
export const moveInputSchema = moveCheckSchema.extend({ reason: z.string().trim().min(1) });
export const moveRangeSchema = z.object({ from: day, to: day });
export const moveDecisionSchema = z.object({ note: z.string().trim().min(1) });
export const moveIdParamsSchema = z.object({ id: z.string().min(1) });
```

- [ ] **Step 4: service** — `backend/src/services/class-move.service.ts`

```ts
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { thaiDay } from "./attendance";
import { parseSlots } from "./enrollment-rules";
import { busyOn, clashesWith, editable, formatDay, fromMinutes, parseDay, toMinutes, weekdayOf, type MoveLike, type RegularSlots } from "./class-move-rules";
import { createNotification, createNotificationsForRole } from "./notification.service";
import { getLecturerProfileByUserId, getStudentProfileByUserId } from "./profile.service";

type Db = Prisma.TransactionClient | typeof prisma;
export type MoveInput = { sectionId: string; originalDate: string; originalStart: string; newDate: string; newStart: string; facilityId?: string; reason?: string };

const moveInclude = {
  section: { include: { course: { include: { lecturer: { include: { user: true } } } } } },
  facility: true,
} satisfies Prisma.ClassMoveInclude;
type MoveRow = Prisma.ClassMoveGetPayload<{ include: typeof moveInclude }>;

export const serializeMove = (m: MoveRow) => ({
  id: m.id,
  sectionId: m.sectionId,
  sectionNumber: m.section.number,
  courseId: m.section.courseId,
  courseCode: m.section.course.code,
  courseName: m.section.course.nameThai || m.section.course.name,
  originalDate: formatDay(m.originalDate),
  originalStart: m.originalStart,
  originalEnd: m.originalEnd,
  newDate: formatDay(m.newDate),
  newStart: m.newStart,
  newEnd: m.newEnd,
  facilityId: m.facilityId,
  room: m.room,
  status: m.status,
  reason: m.reason,
  requestedById: m.requestedById,
  decisionNote: m.decisionNote,
});

const toMoveLike = (m: MoveRow | (Prisma.ClassMoveGetPayload<{ include: { section: { include: { course: true } } } }>)): MoveLike => ({
  id: m.id, sectionId: m.sectionId, label: m.section.course.code,
  originalDate: m.originalDate, originalStart: m.originalStart, originalEnd: m.originalEnd,
  newDate: m.newDate, newStart: m.newStart, newEnd: m.newEnd,
});

const regularOf = (sections: Array<{ id: string; schedule: unknown; course: { code: string } }>): RegularSlots[] =>
  sections.map((s) => ({ sectionId: s.id, label: s.course.code, slots: parseSlots(s.schedule) }));

/** validates the request and finds clashes; throws 400 for anything malformed */
export const checkMove = async (db: Db, input: MoveInput, ignoreMoveId?: string) => {
  const section = await db.section.findUnique({ where: { id: input.sectionId }, include: { course: true, facility: true } });
  if (!section) throw new AppError(404, "Section not found");
  const originalDate = parseDay(input.originalDate);
  const newDate = parseDay(input.newDate);
  if (!originalDate || !newDate) throw new AppError(400, "Dates must be real days (YYYY-MM-DD)");
  const today = thaiDay(new Date());
  if (!editable({ originalDate, newDate }, today)) throw new AppError(400, "Both the original and the new day must be after today");

  const slot = parseSlots(section.schedule).find((s) => s.day === weekdayOf(originalDate) && s.startTime === input.originalStart);
  if (!slot) throw new AppError(400, `${section.course.code} has no class on ${input.originalDate} at ${input.originalStart}`);
  const length = (toMinutes(slot.endTime) ?? 0) - (toMinutes(slot.startTime) ?? 0);
  const newStart = toMinutes(input.newStart);
  if (newStart === null || newStart + length > 24 * 60) throw new AppError(400, "The moved class must start and end on the same day");
  const newEnd = fromMinutes(newStart + length);

  const facilityId = input.facilityId ?? section.facilityId;
  if (!facilityId) throw new AppError(400, "Choose a room for the moved class");
  const facility = await db.facility.findFirst({ where: { id: facilityId, isActive: true } });
  if (!facility) throw new AppError(400, "That room does not exist or is closed");

  const term = { semester: section.course.semester, academicYear: section.course.academicYear };
  const approvedOn = async (where: Prisma.SectionWhereInput) =>
    (await db.classMove.findMany({
      where: { status: "approved", section: where, OR: [{ originalDate: newDate }, { newDate }] },
      include: { section: { include: { course: true } } },
    })).map(toMoveLike);

  // room: weekly classes in this room (same term) and moves in/out of it
  const roomSections = await db.section.findMany({ where: { facilityId, course: term }, include: { course: true } });
  const roomMovesIn = await db.classMove.findMany({ where: { status: "approved", facilityId, newDate }, include: { section: { include: { course: true } } } });
  const roomBusy = busyOn(newDate, regularOf(roomSections), [...(await approvedOn({ facilityId })), ...roomMovesIn.map(toMoveLike)], ignoreMoveId)
    .filter((b, i, all) => all.findIndex((x) => x.start === b.start && x.label === b.label) === i);
  const roomClashes = clashesWith(roomBusy, newStart, newStart + length).filter((b) => !(b.label === section.course.code && formatDay(newDate) === input.originalDate && b.start === toMinutes(slot.startTime)));

  // lecturer: every class of the same lecturer in the same term
  const lecturerSections = await db.section.findMany({ where: { course: { ...term, lecturerId: section.course.lecturerId } }, include: { course: true } });
  const lecturerBusy = busyOn(newDate, regularOf(lecturerSections), await approvedOn({ course: { lecturerId: section.course.lecturerId } }), ignoreMoveId);
  const lecturerClashes = clashesWith(lecturerBusy, newStart, newStart + length)
    .filter((b) => !(b.label === section.course.code && formatDay(newDate) === input.originalDate && b.start === toMinutes(slot.startTime)));

  // students of this section, against their other sections in the same term: warning only
  const enrolled = await db.enrollment.findMany({ where: { sectionId: section.id, status: { not: "dropped" } }, select: { studentId: true } });
  const studentIds = enrolled.map((e) => e.studentId);
  const others = studentIds.length
    ? await db.enrollment.findMany({
        where: { studentId: { in: studentIds }, status: { not: "dropped" }, sectionId: { not: null }, NOT: { sectionId: section.id }, course: term },
        include: { section: { include: { course: true } } },
      })
    : [];
  const counts = new Map<string, number>();
  for (const e of others) {
    if (!e.section) continue;
    const busy = busyOn(newDate, regularOf([e.section]), await approvedOn({ id: e.section.id }), ignoreMoveId);
    if (clashesWith(busy, newStart, newStart + length).length) counts.set(e.section.course.code, (counts.get(e.section.course.code) ?? 0) + 1);
  }
  const studentClashes = Array.from(counts, ([courseCode, count]) => ({ courseCode, count }));

  return {
    roomClashes, lecturerClashes, studentClashes,
    resolved: { section, originalDate, newDate, originalEnd: slot.endTime, newEnd, facilityId, room: facility.room ? `${facility.building}-${facility.room}` : facility.code },
  };
};

const lockSection = (tx: Prisma.TransactionClient, sectionId: string) =>
  tx.$queryRaw`SELECT id FROM "Section" WHERE id = ${sectionId} FOR UPDATE`;

const assertOwnCourse = async (currentUser: any, lecturerId: string) => {
  if (currentUser.role === Role.STAFF || currentUser.role === Role.ADMIN) return;
  if (currentUser.role !== Role.LECTURER) throw new AppError(403, "Only staff and the course lecturer can move classes");
  const lecturer = await getLecturerProfileByUserId(currentUser.id);
  if (lecturer.id !== lecturerId) throw new AppError(403, "Lecturers can only move their own classes");
};

const blockIfClash = (check: Awaited<ReturnType<typeof checkMove>>) => {
  if (check.roomClashes.length || check.lecturerClashes.length) {
    throw new AppError(409, "The room or the lecturer is busy at the new time", { roomClashes: check.roomClashes, lecturerClashes: check.lecturerClashes });
  }
};

const dayLabel = (d: Date) => d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** tells the section's students and the lecturer; a failed notification never undoes the move */
export const notifyMoved = async (m: MoveRow, kind: "moved" | "cancelled") => {
  try {
    const students = await prisma.enrollment.findMany({ where: { sectionId: m.sectionId, status: { not: "dropped" } }, select: { student: { select: { userId: true } } } });
    const code = m.section.course.code;
    const what = kind === "moved"
      ? { message: `${code} on ${formatDay(m.originalDate)} ${m.originalStart} moves to ${formatDay(m.newDate)} ${m.newStart}-${m.newEnd} (${m.room ?? "-"})`,
          messageThai: `${code} คาบ ${dayLabel(m.originalDate)} ${m.originalStart} ย้ายไป ${dayLabel(m.newDate)} ${m.newStart}–${m.newEnd} ห้อง ${m.room ?? "-"}` }
      : { message: `The move of ${code} on ${formatDay(m.originalDate)} ${m.originalStart} was cancelled; the class is back at its usual time`,
          messageThai: `ยกเลิกการย้ายคาบ ${code} วันที่ ${dayLabel(m.originalDate)} ${m.originalStart} แล้ว กลับไปเรียนเวลาเดิม` };
    for (const userId of [...students.map((s) => s.student.userId), m.section.course.lecturer.userId]) {
      await createNotification({
        userId, type: "class_move", priority: "high",
        title: kind === "moved" ? `Class moved: ${code}` : `Class move cancelled: ${code}`,
        titleThai: kind === "moved" ? `ย้ายคาบ ${code}` : `ยกเลิกการย้ายคาบ ${code}`,
        ...what,
        actionUrl: `/schedule?week=${formatDay(m.originalDate)}`,
      });
    }
  } catch (err) {
    console.error(`class move ${m.id}: notification failed`, err);
  }
};

export const createMove = async (currentUser: any, input: MoveInput) => {
  const section = await prisma.section.findUnique({ where: { id: input.sectionId }, include: { course: true } });
  if (!section) throw new AppError(404, "Section not found");
  await assertOwnCourse(currentUser, section.course.lecturerId);
  const isStaff = currentUser.role === Role.STAFF || currentUser.role === Role.ADMIN;

  const { created, check, replaced } = await prisma.$transaction(async (tx) => {
    await lockSection(tx, section.id);
    const check = await checkMove(tx, input);
    const active = await tx.classMove.findFirst({
      where: { sectionId: section.id, originalDate: check.resolved.originalDate, originalStart: input.originalStart, status: { in: ["pending", "approved"] } },
    });
    if (active && (active.status === "pending" || !isStaff)) {
      throw new AppError(409, active.status === "pending" ? "A request for this class is waiting for a decision" : "This class is already moved; ask staff to change it", { moveId: active.id });
    }
    const replaced = active ? await tx.classMove.update({ where: { id: active.id }, data: { status: "cancelled", decidedById: currentUser.id, decidedAt: new Date() } }) : null;
    const recheck = replaced ? await checkMove(tx, input, replaced.id) : check;
    blockIfClash(recheck);
    const created = await tx.classMove.create({
      data: {
        sectionId: section.id, originalDate: recheck.resolved.originalDate, originalStart: input.originalStart, originalEnd: recheck.resolved.originalEnd,
        newDate: recheck.resolved.newDate, newStart: input.newStart, newEnd: recheck.resolved.newEnd,
        facilityId: recheck.resolved.facilityId, room: recheck.resolved.room,
        status: isStaff ? "approved" : "pending", reason: input.reason ?? "", requestedById: currentUser.id,
        ...(isStaff ? { decidedById: currentUser.id, decidedAt: new Date() } : {}),
      },
      include: moveInclude,
    });
    return { created, check: recheck, replaced };
  });

  if (isStaff) {
    await notifyMoved(created, "moved");
  } else {
    try {
      await createNotificationsForRole(Role.STAFF, {
        type: "class_move_request", title: `Class move request: ${created.section.course.code}`, titleThai: `คำขอย้ายคาบ ${created.section.course.code}`,
        message: `${created.section.course.code} ${created.originalStart} on ${formatDay(created.originalDate)} → ${formatDay(created.newDate)} ${created.newStart}`,
        messageThai: `${created.section.course.code} คาบ ${dayLabel(created.originalDate)} ${created.originalStart} ขอย้ายไป ${dayLabel(created.newDate)} ${created.newStart}`,
        actionUrl: "/schedule-management",
      });
    } catch (err) {
      console.error(`class move ${created.id}: notification failed`, err);
    }
  }
  void replaced;
  return { move: serializeMove(created), studentClashes: check.studentClashes };
};

export const listMoves = async (currentUser: any, from: string, to: string) => {
  const start = parseDay(from);
  const end = parseDay(to);
  if (!start || !end) throw new AppError(400, "Dates must be real days (YYYY-MM-DD)");
  const inRange = { OR: [{ originalDate: { gte: start, lte: end } }, { newDate: { gte: start, lte: end } }] };
  let scope: Prisma.ClassMoveWhereInput;
  if (currentUser.role === Role.STUDENT) {
    const student = await getStudentProfileByUserId(currentUser.id);
    scope = { status: "approved", section: { enrollments: { some: { studentId: student.id, status: { not: "dropped" } } } } };
  } else if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    scope = { section: { course: { lecturerId: lecturer.id } } };
  } else if (currentUser.role === Role.STAFF || currentUser.role === Role.ADMIN) {
    scope = {};
  } else {
    throw new AppError(403, "Class moves are not available for your account");
  }
  const rows = await prisma.classMove.findMany({ where: { AND: [inRange, scope] }, include: moveInclude, orderBy: [{ originalDate: "asc" }, { originalStart: "asc" }] });
  return rows.map(serializeMove);
};

export const checkMoveFor = async (currentUser: any, input: MoveInput) => {
  const section = await prisma.section.findUnique({ where: { id: input.sectionId }, include: { course: true } });
  if (!section) throw new AppError(404, "Section not found");
  await assertOwnCourse(currentUser, section.course.lecturerId);
  const { roomClashes, lecturerClashes, studentClashes, resolved } = await checkMove(prisma, input);
  return { roomClashes, lecturerClashes, studentClashes, newEnd: resolved.newEnd, room: resolved.room };
};

export { moveInclude, lockSection, blockIfClash, dayLabel };
```

> `editable`, `today` และ dedupe ใน `roomBusy` มีไว้กันคาบเดียวกันถูกนับซ้ำเมื่อการย้ายเข้าห้องปรากฏทั้งใน `approvedOn({ facilityId })` (section ที่อยู่ห้องนี้) และ `roomMovesIn` (ย้ายเข้าห้องนี้) · ตัวกรองท้าย `roomClashes`/`lecturerClashes` ตัด "คาบเดิมของตัวเอง" ออก (กรณีย้ายในวันเดียวกันเหลื่อมเวลาเดิม) · ข้อจำกัดที่รู้: คาบประจำนับเฉพาะเทอมเดียวกับวิชาต้นทาง (spec ข้อ 4) — บันทึกเป็น ruling ใน ledger ตอนจบ Task

- [ ] **Step 5: controller + routes**

`backend/src/controllers/class-moves.controller.ts`:

```ts
import { asyncHandler } from "../utils/async-handler";
import { requireUser } from "../utils/user";
import { checkMoveFor, createMove, listMoves } from "../services/class-move.service";

export const listMovesHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, moves: await listMoves(requireUser(req), String(req.query.from), String(req.query.to)) });
});

export const checkMoveHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await checkMoveFor(requireUser(req), req.body)) });
});

export const createMoveHandler = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, ...(await createMove(requireUser(req), req.body)) });
});
```

`backend/src/routes/class-moves.routes.ts`:

```ts
import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import { moveCheckSchema, moveInputSchema, moveRangeSchema } from "../schemas/class-move.schema";
import { checkMoveHandler, createMoveHandler, listMovesHandler } from "../controllers/class-moves.controller";

const router = Router();
const movers = checkRole([Role.STAFF, Role.ADMIN, Role.LECTURER]);

router.get("/class-moves", requireAuth, validate(moveRangeSchema, "query"), listMovesHandler);
router.post("/class-moves/check", requireAuth, movers, validate(moveCheckSchema), checkMoveHandler);
router.post("/class-moves", requireAuth, movers, validate(moveInputSchema), createMoveHandler);

export const classMovesRoutes = router;
```

`index.ts`: `import { classMovesRoutes } from "./class-moves.routes";` และ `router.use(classMovesRoutes);` ต่อท้าย

- [ ] **Step 6: รันให้ผ่าน** — `cd backend && npx tsc --noEmit -p . && npx vitest run tests/class-moves-api.test.ts` → PASS · `npm test` ทั้งชุด → ผ่าน
- [ ] **Step 7: Commit** — ข้าม

---

### Task 3: อนุมัติ / ปฏิเสธ / ถอน / ยกเลิก / รายการรอ

**Files:**
- Modify: `backend/src/services/class-move.service.ts` (เพิ่ม `listPending`, `approveMove`, `rejectMove`, `withdrawMove`, `cancelMove`)
- Modify: `backend/src/controllers/class-moves.controller.ts`, `backend/src/routes/class-moves.routes.ts`
- Modify: `backend/tests/class-moves-api.test.ts` (เพิ่ม describe)

**Interfaces — Produces:** `GET /class-moves/pending` (staff/admin) → `{ moves }` · `POST /class-moves/:id/approve` (staff/admin) → `{ move, studentClashes }` · `POST /class-moves/:id/reject` `{ note }` (staff/admin) → `{ move }` · `POST /class-moves/:id/withdraw` (ผู้ยื่น) → `{ move }` · `POST /class-moves/:id/cancel` (staff/admin) → `{ move }` · สถานะไม่ถูก/เลยวัน → 409

- [ ] **Step 1: เทสต์ที่ fail** — ต่อท้าย `backend/tests/class-moves-api.test.ts` (เพิ่ม `afterEach, vi` ใน import ของ vitest)

```ts
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
```

> `vi.setSystemTime` ทำให้ JWT ที่ออกด้วยเวลาจริงอาจ "ยังไม่ถึงเวลาใช้" ถ้า library ตรวจ `nbf`/`iat` — ถ้า 401 ให้ login หลังตั้งเวลา (ได้ทำแล้วในเทสต์: `const auth = await staff()` หลัง setSystemTime)

- [ ] **Step 2: รันให้ fail** — `cd backend && npx vitest run tests/class-moves-api.test.ts -t "deciding"` → FAIL (404)

- [ ] **Step 3: เขียน service** — ต่อท้าย `class-move.service.ts`:

```ts
const findMove = async (db: Db, id: string) => {
  const m = await db.classMove.findUnique({ where: { id }, include: moveInclude });
  if (!m) throw new AppError(404, "Class move not found");
  return m;
};

const notifyDecision = async (m: MoveRow, approved: boolean) => {
  try {
    await createNotification({
      userId: m.requestedById, type: "class_move_decision", priority: "high",
      title: `${approved ? "Approved" : "Rejected"}: ${m.section.course.code} move`,
      titleThai: `${approved ? "อนุมัติ" : "ไม่อนุมัติ"}คำขอย้ายคาบ ${m.section.course.code}`,
      message: `${m.section.course.code} ${formatDay(m.originalDate)} ${m.originalStart} → ${formatDay(m.newDate)} ${m.newStart}${m.decisionNote ? ` · ${m.decisionNote}` : ""}`,
      messageThai: `${m.section.course.code} คาบ ${dayLabel(m.originalDate)} ${m.originalStart} → ${dayLabel(m.newDate)} ${m.newStart}${m.decisionNote ? ` · ${m.decisionNote}` : ""}`,
      actionUrl: `/schedule?week=${formatDay(m.originalDate)}`,
    });
  } catch (err) {
    console.error(`class move ${m.id}: notification failed`, err);
  }
};

export const listPending = async () =>
  (await prisma.classMove.findMany({ where: { status: "pending" }, include: moveInclude, orderBy: { createdAt: "asc" } })).map(serializeMove);

export const approveMove = async (currentUser: any, id: string) => {
  const { updated, check } = await prisma.$transaction(async (tx) => {
    const m = await findMove(tx, id);
    await lockSection(tx, m.sectionId);
    const fresh = await findMove(tx, id);
    if (fresh.status !== "pending") throw new AppError(409, "Only waiting requests can be approved");
    const check = await checkMove(tx, {
      sectionId: fresh.sectionId, originalDate: formatDay(fresh.originalDate), originalStart: fresh.originalStart,
      newDate: formatDay(fresh.newDate), newStart: fresh.newStart, facilityId: fresh.facilityId ?? undefined,
    }, fresh.id);
    blockIfClash(check);
    const updated = await tx.classMove.update({
      where: { id }, data: { status: "approved", decidedById: currentUser.id, decidedAt: new Date() }, include: moveInclude,
    });
    return { updated, check };
  });
  await notifyMoved(updated, "moved");
  await notifyDecision(updated, true);
  return { move: serializeMove(updated), studentClashes: check.studentClashes };
};

export const rejectMove = async (currentUser: any, id: string, note: string) => {
  const updated = await prisma.$transaction(async (tx) => {
    const m = await findMove(tx, id);
    await lockSection(tx, m.sectionId);
    if ((await findMove(tx, id)).status !== "pending") throw new AppError(409, "Only waiting requests can be rejected");
    return tx.classMove.update({ where: { id }, data: { status: "rejected", decidedById: currentUser.id, decidedAt: new Date(), decisionNote: note }, include: moveInclude });
  });
  await notifyDecision(updated, false);
  return { move: serializeMove(updated) };
};

export const withdrawMove = async (currentUser: any, id: string) => {
  const updated = await prisma.$transaction(async (tx) => {
    const m = await findMove(tx, id);
    await lockSection(tx, m.sectionId);
    const fresh = await findMove(tx, id);
    if (fresh.requestedById !== currentUser.id) throw new AppError(403, "Only the person who asked can withdraw a request");
    if (fresh.status !== "pending") throw new AppError(409, "Only waiting requests can be withdrawn");
    return tx.classMove.update({ where: { id }, data: { status: "withdrawn" }, include: moveInclude });
  });
  return { move: serializeMove(updated) };
};

export const cancelMove = async (currentUser: any, id: string) => {
  const updated = await prisma.$transaction(async (tx) => {
    const m = await findMove(tx, id);
    await lockSection(tx, m.sectionId);
    const fresh = await findMove(tx, id);
    if (fresh.status !== "approved") throw new AppError(409, "Only moves in effect can be cancelled");
    if (!editable(fresh, thaiDay(new Date()))) throw new AppError(409, "This move's day has already come");
    return tx.classMove.update({ where: { id }, data: { status: "cancelled", decidedById: currentUser.id, decidedAt: new Date() }, include: moveInclude });
  });
  await notifyMoved(updated, "cancelled");
  return { move: serializeMove(updated) };
};
```

(ลบบรรทัด `export { moveInclude, lockSection, blockIfClash, dayLabel };` ของ Task 2 ถ้าไม่มีที่อื่นใช้)

- [ ] **Step 4: controller + routes** — เพิ่ม handler 5 ตัวรูปแบบเดียวกับ Task 2 (`listPendingHandler` → `{ success, moves }`, `approveMoveHandler`, `rejectMoveHandler` ใช้ `req.body.note`, `withdrawMoveHandler`, `cancelMoveHandler` → `{ success, ...result }`) และ routes:

```ts
const deciders = checkRole([Role.STAFF, Role.ADMIN]);
router.get("/class-moves/pending", requireAuth, deciders, listPendingHandler);
router.post("/class-moves/:id/approve", requireAuth, deciders, validate(moveIdParamsSchema, "params"), approveMoveHandler);
router.post("/class-moves/:id/reject", requireAuth, deciders, validate(moveIdParamsSchema, "params"), validate(moveDecisionSchema), rejectMoveHandler);
router.post("/class-moves/:id/withdraw", requireAuth, checkRole([Role.LECTURER]), validate(moveIdParamsSchema, "params"), withdrawMoveHandler);
router.post("/class-moves/:id/cancel", requireAuth, deciders, validate(moveIdParamsSchema, "params"), cancelMoveHandler);
```

(`/class-moves/pending` ต้องประกาศก่อน route ที่มี `:id`)

- [ ] **Step 5: รันให้ผ่าน** — `cd backend && npx vitest run tests/class-moves-api.test.ts` → PASS · `npm test` → ผ่าน
- [ ] **Step 6: Commit** — ข้าม

---

### Task 4: กันการย้ายถาวรที่ทับการย้ายค้าง

**Files:**
- Modify: `backend/src/services/course.service.ts` (`updateCourse`)
- Modify: `backend/tests/class-moves-api.test.ts`

**Interfaces — Produces:** `PATCH /courses/:id` → 409 `"Cancel the pending class moves first"` `details: [{ moveId, sectionNumber, originalDate, originalStart, newDate, newStart }]` เมื่อคาบประจำที่มีการย้ายค้าง (pending/approved, แก้ได้) หายไปหรือเปลี่ยนวัน/เวลาเริ่ม

- [ ] **Step 1: เทสต์ที่ fail**

```ts
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
```

- [ ] **Step 2: รันให้ fail** — `npx vitest run tests/class-moves-api.test.ts -t "weekly changes"` → FAIL (200)

- [ ] **Step 3: เขียน** — ใน `updateCourse` ภายใน `prisma.$transaction` ก่อนบล็อก `if (preparedSections) {` เดิม ให้เพิ่ม:

```ts
    // owner decision 7/10/69: a weekly change may not drop a class that has a one-time move waiting or in effect
    if (preparedSections) {
      const today = thaiDay(new Date());
      const pendingMoves = await tx.classMove.findMany({
        where: { section: { courseId: existing.id }, status: { in: ["pending", "approved"] }, originalDate: { gt: today }, newDate: { gt: today } },
        include: { section: true },
      });
      const nextByNumber = new Map(preparedSections.map((s: { number: string; schedule: unknown }) => [s.number, parseSlots(s.schedule)]));
      const broken = pendingMoves.filter((m) => {
        const slots = nextByNumber.get(m.section.number);
        return !slots?.some((s) => s.day === weekdayOf(m.originalDate) && s.startTime === m.originalStart);
      });
      if (broken.length > 0) {
        throw new AppError(409, "Cancel the pending class moves first", broken.map((m) => ({
          moveId: m.id, sectionNumber: m.section.number, originalDate: formatDay(m.originalDate), originalStart: m.originalStart,
          newDate: formatDay(m.newDate), newStart: m.newStart,
        })));
      }
    }
```

(import `thaiDay` จาก `./attendance`, `parseSlots` จาก `./enrollment-rules`, `formatDay, weekdayOf` จาก `./class-move-rules`)

- [ ] **Step 4: รันให้ผ่าน** — `npx vitest run tests/class-moves-api.test.ts` → PASS · `npm test` → ผ่าน
- [ ] **Step 5: apply กับ dev** — `cd backend && npx prisma migrate deploy` → applied · `npx prisma migrate status` → up to date
- [ ] **Step 6: Commit** — ข้าม (Por: backend ก้อนที่ 1 = Task 1–4 + spec link + แผน)

---

### Task 5: ตารางรายสัปดาห์ (นักศึกษา/อาจารย์) + dashboard

**Files:**
- Modify: `src/lib/timetable.ts`, `src/lib/timetable.test.ts`
- Modify: `src/lib/api.ts` (`ClassMoveView`, `api.classMoves`)
- Create: `src/components/common/WeeklyTimetable.tsx`
- Modify: `src/pages/Schedule.tsx`, `src/pages/dashboards/StudentDashboard.tsx`, `src/pages/PersonalDashboard.tsx`, `src/pages/dashboards/LecturerDashboard.tsx`
- Create: `e2e/class-moves.spec.ts`

**Interfaces:**
- Consumes: `GET /class-moves` (Task 2) · `placeSlots`/lane logic (F3a)
- Produces:
  - `type ClassMoveView` (= `serializeMove` ของ Task 2) ใน `src/lib/api.ts` · `api.classMoves = { list(from, to), check(body), create(body), pending(), approve(id), reject(id, note), withdraw(id), cancel(id) }`
  - `thaiDayString(d: Date): string` ("YYYY-MM-DD" ไทย — ใช้ `thaiToday` จาก `thai-date.ts`) · `weekOf(day: string): string` (วันจันทร์) · `addDays(day: string, n: number): string`
  - `type Occurrence = PlacedSlot & { date: string; kind: 'regular' | 'moved-out' | 'moved-in'; move?: ClassMoveView }`
  - `weekOccurrences(entries: TimetableEntry[], weekStart: string, moves: ClassMoveView[]): Occurrence[]` — ใช้เฉพาะ `approved` · `moved-out` lane=0 lanes=1 (วาดข้างหลัง) · lane ของที่เหลือคิดรวมกัน
  - `<WeeklyTimetable entries term weekStart moves onSlotClick? showWeekNav? onWeekChange? />` — บล็อก `data-testid="timetable-slot"` + `data-kind`, `data-date`, `data-course`, `data-start`

- [ ] **Step 1: unit test ที่ fail** — ต่อท้าย `src/lib/timetable.test.ts` (เพิ่ม `addDays, weekOf, weekOccurrences` ใน import)

```ts
describe('weeks', () => {
  it('starts on Monday and adds days', () => {
    expect(weekOf('2030-09-18')).toBe('2030-09-16');
    expect(weekOf('2030-09-22')).toBe('2030-09-16');
    expect(addDays('2030-09-16', 7)).toBe('2030-09-23');
  });
});

describe('weekOccurrences', () => {
  const A = course('A', [section('s1', [slot('monday', '09:00', '12:00')])]);
  const entries = [{ course: A, section: A.sections[0] }];
  const mv = (over: Record<string, unknown>) => ({
    id: 'm', sectionId: 's1', sectionNumber: '01', courseId: 'A', courseCode: 'A', courseName: 'A', originalDate: '2030-09-16', originalStart: '09:00', originalEnd: '12:00',
    newDate: '2030-09-18', newStart: '13:00', newEnd: '16:00', facilityId: null, room: 'R2', status: 'approved', reason: '', requestedById: 'u', decisionNote: null, ...over,
  }) as never;

  it('dates the weekly classes', () => {
    expect(weekOccurrences(entries, '2030-09-16', []).map((o) => [o.date, o.kind])).toEqual([['2030-09-16', 'regular']]);
  });

  it('shows a moved class as out on its day and in on the new day', () => {
    const occ = weekOccurrences(entries, '2030-09-16', [mv({})]);
    expect(occ.map((o) => [o.date, o.kind, o.start])).toEqual([['2030-09-16', 'moved-out', 540], ['2030-09-18', 'moved-in', 780]]);
    expect(occ[1].slot.room).toBe('R2');
  });

  it('handles moves across weeks and ignores requests that are not approved', () => {
    expect(weekOccurrences(entries, '2030-09-23', [mv({ newDate: '2030-09-24' })]).map((o) => [o.date, o.kind])).toEqual([['2030-09-23', 'regular']]);
    expect(weekOccurrences(entries, '2030-09-09', [mv({ originalDate: '2030-09-16', newDate: '2030-09-10' })]).map((o) => [o.date, o.kind])).toEqual([['2030-09-09', 'regular'], ['2030-09-10', 'moved-in']]);
    expect(weekOccurrences(entries, '2030-09-16', [mv({ status: 'pending' })]).map((o) => o.kind)).toEqual(['regular']);
  });

  it('moved-out blocks take no lane', () => {
    const B = course('B', [section('s2', [slot('monday', '10:00', '11:00')])]);
    const occ = weekOccurrences([...entries, { course: B, section: B.sections[0] }], '2030-09-16', [mv({})]);
    expect(occ.find((o) => o.course.code === 'B')!.lanes).toBe(1);
  });
});
```

- [ ] **Step 2: รันให้ fail** — `npx vitest run src/lib/timetable.test.ts` → FAIL

- [ ] **Step 3: เขียนใน `timetable.ts`** — refactor ส่วน lane ของ `placeSlots` เป็น `assignLanes(slots: PlacedSlot[]): PlacedSlot[]` (ใช้ทั้งสองที่) แล้วเพิ่ม:

```ts
import type { ClassMoveView } from '@/lib/api';

const MS_DAY = 24 * 60 * 60 * 1000;
const dayToDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
export const addDays = (day: string, n: number) => new Date(dayToDate(day).getTime() + n * MS_DAY).toISOString().slice(0, 10);
export const weekOf = (day: string) => addDays(day, -((dayToDate(day).getUTCDay() + 6) % 7));

export type Occurrence = PlacedSlot & { date: string; kind: 'regular' | 'moved-out' | 'moved-in'; move?: ClassMoveView };

export const weekOccurrences = (entries: TimetableEntry[], weekStart: string, moves: ClassMoveView[]): Occurrence[] => {
  const approved = moves.filter((m) => m.status === 'approved');
  const days = DAY_KEYS.map((day, i) => ({ day, date: addDays(weekStart, i) }));
  const out: Occurrence[] = [];
  for (const p of placeSlots(entries)) {
    const date = days.find((d) => d.day === p.day)!.date;
    const move = approved.find((m) => m.sectionId === p.section?.id && m.originalDate === date && m.originalStart === formatMinutes(p.start));
    out.push({ ...p, key: `${p.key}-${date}`, date, kind: move ? 'moved-out' : 'regular', move, lane: 0, lanes: 1 });
  }
  for (const m of approved) {
    const target = days.find((d) => d.date === m.newDate);
    const entry = entries.find((e) => e.section?.id === m.sectionId);
    const start = toMinutes(m.newStart);
    const end = toMinutes(m.newEnd);
    if (!target || !entry || start === null || end === null) continue;
    out.push({
      key: `move-${m.id}`, course: entry.course, section: entry.section,
      slot: { id: `move-${m.id}`, day: target.day, dayThai: '', startTime: m.newStart, endTime: m.newEnd, room: m.room ?? '', type: 'lecture' } as Schedule,
      day: target.day, start, end, lane: 0, lanes: 1, date: m.newDate, kind: 'moved-in', move: m,
    });
  }
  const laned = assignLanes(out.filter((o) => o.kind !== 'moved-out')) as Occurrence[];
  return [...out.filter((o) => o.kind === 'moved-out'), ...laned]
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
};
```

- [ ] **Step 4: รัน unit ให้ผ่าน** — `npx vitest run src/lib/timetable.test.ts` → PASS

- [ ] **Step 5: E2E ที่ fail** — `e2e/class-moves.spec.ts`

```ts
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const token = async (request: APIRequestContext, email: string) =>
  (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/** next Monday (Thai) at least 8 days ahead, as YYYY-MM-DD */
const futureMonday = () => {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 8));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const plus = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

async function classFor(request: APIRequestContext, staff: Record<string, string>) {
  // narin's lecturer profile id, taken from the course narin teaches
  const dii340 = (await (await request.get(`${API}/courses?q=DII340`, { headers: staff })).json()).courses.find((x: { code: string }) => x.code === "DII340");
  const narin = { id: dii340.lecturerId as string };
  const facilities = (await (await request.get(`${API}/facilities`, { headers: staff })).json()).facilities;
  const code = `MV${Date.now().toString(36).toUpperCase()}`;
  const res = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: narin.id, status: "active",
    sections: [{ number: "01", maxStudents: 5, facilityId: facilities[0].id, schedule: [{ day: "saturday", startTime: "08:00", endTime: "09:00" }] }],
  } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).course as { id: string; code: string; sections: Array<{ id: string }> };
}
const park = (request: APIRequestContext, staff: Record<string, string>, id: string) =>
  request.patch(`${API}/courses/${id}`, { headers: staff, data: { academicYear: "2500" } });

test("a student sees a staff move in the week it happens", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const c = await classFor(request, staff);
  const monday = futureMonday();
  const saturday = plus(monday, 5);
  const studentToken = await token(request, "chompoo@student.showpro.local");
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: c.id, sectionId: c.sections[0].id } })).ok()).toBeTruthy();
  const moved = await request.post(`${API}/class-moves`, { headers: staff, data: { sectionId: c.sections[0].id, originalDate: saturday, originalStart: "08:00", newDate: plus(monday, 6), newStart: "10:00", reason: "e2e" } });
  expect(moved.status()).toBe(201);
  const moveId = (await moved.json()).move.id;
  try {
    await login(page, "chompoo@student.showpro.local");
    await page.goto(`/schedule?week=${monday}`);
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=moved-out]`)).toHaveAttribute("data-date", saturday);
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=moved-in]`)).toHaveAttribute("data-start", "10:00");
    await page.getByTestId("week-next").click();
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=regular]`)).toHaveCount(1);
  } finally {
    await request.post(`${API}/class-moves/${moveId}/cancel`, { headers: staff });
    await request.delete(`${API}/enrollments/course/${c.id}`, { headers: student });
    await park(request, staff, c.id);
  }
});
```

- [ ] **Step 6: รันให้ fail** — รีสตาร์ต backend dev แล้ว `npx playwright test e2e/class-moves.spec.ts` → FAIL

- [ ] **Step 7: api + component + หน้า**
  1. `src/lib/api.ts`: export `type ClassMoveView` (field ตาม `serializeMove`) · `classMoves`: `list: (from, to) => request<ApiEnvelope<{ moves: ClassMoveView[] }>>(\`/class-moves?from=${from}&to=${to}\`)`, `check: (body) => POST /class-moves/check → { roomClashes, lecturerClashes, studentClashes, newEnd, room }`, `create: (body) => POST /class-moves → { move, studentClashes }`, `pending: () => GET /class-moves/pending`, `approve/withdraw/cancel: (id) => POST /class-moves/${id}/…`, `reject: (id, note) => POST …/reject { note }`
  2. `WeeklyTimetable.tsx`: คัดลอกโครงจาก `Timetable.tsx` (F3a) แต่รับ `occurrences: Occurrence[]` (เรียก `weekOccurrences` ใน component จาก props `entries, weekStart, moves`) · หัวคอลัมน์ `จันทร์ 16` (วันที่จาก `addDays(weekStart, i)`) · 7 วันเสมอถ้ามีคาบเสาร์–อาทิตย์ในสัปดาห์นั้น (ใช้กฎเดียวกับ Timetable) · บล็อก `moved-out`: `opacity-40 border-dashed z-0 left-0 width-100%` + ป้าย `ย้ายไป {วันสั้น} {วันที่} {newStart}` · `moved-in`: กรอบส้ม + ป้าย `ย้ายมาจาก {วันสั้น} {วันที่เดิม}` · ทุกบล็อกมี `data-testid="timetable-slot" data-course data-day data-date data-start data-kind` · ถ้า `showWeekNav`: ปุ่ม `data-testid="week-prev"`, `week-next`, `week-today` + ข้อความช่วงวันที่ไทย (`toLocaleDateString('th-TH', { day:'numeric', month:'short', timeZone:'UTC' })`) · ถ้า `onSlotClick` ส่งมา บล็อก `regular`/`moved-in` ที่ `date > thaiToday()` คลิกได้
  3. `Schedule.tsx`: state `weekStart` เริ่มจาก `searchParams.get('week')` (ผ่าน `weekOf`) หรือ `weekOf(thaiToday())` · โหลด `api.classMoves.list(weekStart, addDays(weekStart, 6))` เมื่อ `weekStart` เปลี่ยน (นักศึกษาและอาจารย์) · แทน `<Timetable>` ด้วย `<WeeklyTimetable entries={…} term={…} weekStart={weekStart} moves={moves} showWeekNav onWeekChange={setWeekStart} />` · "คาบวันนี้" ใช้ `weekOccurrences(...)` ของสัปดาห์นี้ กรอง `date === thaiToday() && kind !== 'moved-out'` · สถิติชั่วโมง/วันเรียนยังมาจากคาบประจำ (ตารางประจำ) — ป้ายเขียน "ต่อสัปดาห์ (ตามตารางประจำ)"
  4. Dashboards (StudentDashboard ×2, PersonalDashboard, LecturerDashboard): โหลด `api.classMoves.list(weekOf(thaiToday()), addDays(weekOf(thaiToday()), 6))` คู่กับข้อมูลเดิม · `<WeeklyTimetable … weekStart={weekOf(thaiToday())} moves={moves} />` (ไม่มี nav) · ถ้าโหลด moves ไม่ได้ ใช้ `[]` และไม่ซ่อนตาราง

- [ ] **Step 8: รันให้ผ่าน** — `npx tsc --noEmit -p tsconfig.app.json` (ไม่มี error ใหม่) · `npx playwright test e2e/class-moves.spec.ts e2e/timetable.spec.ts` → PASS
- [ ] **Step 9: Commit** — ข้าม

---

### Task 6: ฟอร์มย้าย/ขอย้าย + หน้า staff + แผงคำขอ

**Files:**
- Create: `src/components/schedule/ClassMoveDialog.tsx`
- Modify: `src/pages/Schedule.tsx` (อาจารย์: คลิกคาบ → dialog; ป้าย "รออนุมัติ" + ถอน)
- Modify: `src/pages/ScheduleManagement.tsx` (สวิตช์ประจำ/รายสัปดาห์, ลากในสัปดาห์ → dialog, คลิกคาบที่ย้ายแล้ว → ยกเลิก, 409 จากลากถาวร → รายการ, แผงคำขอใหม่)
- Modify: `src/components/schedule/DraggableSchedule.tsx` (prop `weekStart?` + `moves?` → ใช้ `weekOccurrences`; `onMove` ส่ง `date` ด้วย; `onSlotClick?`)
- Modify: `e2e/class-moves.spec.ts`

**Interfaces:**
- Consumes: Task 2–4 API, Task 5 `api.classMoves`, `weekOccurrences`
- Produces: `<ClassMoveDialog open onOpenChange occurrence={Occurrence} mode="move" | "request" initialDate? initialStart? onDone={() => void} />` — `data-testid`: `move-date` (input date), `move-start` (select), `move-room` (select), `move-reason` (textarea), `move-clash-block` (🔴 แต่ละบรรทัด), `move-clash-warn` (🟡), `move-submit`

- [ ] **Step 1: E2E ที่ fail** — ต่อท้าย `e2e/class-moves.spec.ts`

```ts
test("a lecturer asks, staff see the clash check and approve, the lecturer's week changes", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const c = await classFor(request, staff);
  const monday = futureMonday();
  try {
    await login(page, "narin@showpro.local");
    await page.goto(`/schedule?week=${monday}`);
    await page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=regular]`).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("move-date").fill(plus(monday, 6));
    await dialog.getByTestId("move-start").selectOption("10:00");
    await dialog.getByTestId("move-reason").fill("conference");
    await expect(dialog.getByTestId("move-clash-block")).toHaveCount(0);
    await dialog.getByTestId("move-submit").click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"]`).first()).toContainText(/รออนุมัติ|Pending/);

    await page.evaluate(() => localStorage.clear()); // sign out
    await login(page, "staff@showpro.local");
    await page.goto("/schedule-management");
    const row = page.getByTestId("move-request").filter({ hasText: c.code });
    await expect(row).toContainText("10:00");
    await row.getByRole("button", { name: /อนุมัติ|Approve/ }).click();
    await expect(row).toHaveCount(0);

    await page.evaluate(() => localStorage.clear());
    await login(page, "narin@showpro.local");
    await page.goto(`/schedule?week=${monday}`);
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=moved-in]`)).toHaveAttribute("data-start", "10:00");
  } finally {
    const moves = (await (await request.get(`${API}/class-moves?from=${monday}&to=${plus(monday, 6)}`, { headers: staff })).json()).moves;
    for (const m of moves.filter((x: { courseCode: string; status: string }) => x.courseCode === c.code && x.status === "approved")) {
      await request.post(`${API}/class-moves/${m.id}/cancel`, { headers: staff });
    }
    await park(request, staff, c.id);
  }
});

test("the form blocks a busy room and only warns about students", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const c = await classFor(request, staff);
  const monday = futureMonday();
  try {
    await login(page, "staff@showpro.local");
    await page.goto(`/schedule-management?week=${monday}`);
    await page.getByTestId("mode-weekly").click();
    await page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=regular]`).click();
    const dialog = page.getByRole("dialog");
    // DII340 meets Mondays 09:00–12:00 in its room; move this class onto that Monday slot in the same room
    await dialog.getByTestId("move-date").fill(monday);
    await dialog.getByTestId("move-start").selectOption("09:00");
    const facilities = (await (await request.get(`${API}/facilities`, { headers: staff })).json()).facilities as Array<{ id: string; room?: string; code: string }>;
    const dii401 = facilities.find((f) => `${f.code} ${f.room ?? ""}`.includes("401"))!;
    await dialog.getByTestId("move-room").selectOption(dii401.id);
    await dialog.getByTestId("move-reason").fill("test");
    await expect(dialog.getByTestId("move-clash-block").first()).toBeVisible();
    await expect(dialog.getByTestId("move-submit")).toBeDisabled();
  } finally {
    await park(request, staff, c.id);
  }
});
```

> สลับผู้ใช้ด้วย `localStorage.clear()` (token อยู่ที่ `showpro_auth_token`) · ห้อง DII-401 หาจาก `GET /facilities` · ช่วงนี้ DII340 ของ narin ไม่ได้ทำให้ "อาจารย์ชน" ในข้อสอง เพราะวิชาที่สร้างเป็นของ narin เอง — ดังนั้นจะเห็นทั้ง 🔴 ห้องชน และ 🔴 อาจารย์ชน ซึ่งเทสต์รับได้ (ดูแค่ว่ามี 🔴 และปุ่มกดไม่ได้)

- [ ] **Step 2: รันให้ fail** — `npx playwright test e2e/class-moves.spec.ts` → 2 ข้อใหม่ FAIL

- [ ] **Step 3: `ClassMoveDialog.tsx`**

```tsx
import React from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asArray, asRecord, asString } from '@/lib/live-data';
import { thaiToday } from '@/lib/thai-date';
import { addDays, DAY_LABELS, formatMinutes, type Occurrence } from '@/lib/timetable';

type Clash = { start: number; end: number; label: string };
type CheckResult = { roomClashes: Clash[]; lecturerClashes: Clash[]; studentClashes: Array<{ courseCode: string; count: number }>; newEnd: string; room: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrence: Occurrence | null;
  mode: 'move' | 'request';
  initialDate?: string;
  initialStart?: string;
  onDone: () => void;
}

const START_TIMES = Array.from({ length: 30 }, (_, i) => formatMinutes(7 * 60 + i * 30)); // 07:00–21:30

export function ClassMoveDialog({ open, onOpenChange, occurrence, mode, initialDate, initialStart, onDone }: Props) {
  const { language } = useLanguage();
  const isTH = language !== 'en';
  const [date, setDate] = React.useState('');
  const [start, setStart] = React.useState('');
  const [facilityId, setFacilityId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [rooms, setRooms] = React.useState<Array<{ id: string; label: string }>>([]);
  const [check, setCheck] = React.useState<CheckResult | null>(null);
  const [checkError, setCheckError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !occurrence) return;
    setDate(initialDate ?? '');
    setStart(initialStart ?? formatMinutes(occurrence.start));
    setReason('');
    setCheck(null);
    setFacilityId('');
    api.facilities.list().then((r) => setRooms(asArray(r.facilities)
      .map((f) => asRecord(f))
      .filter((f) => f.isActive !== false)
      .map((f) => ({ id: asString(f.id), label: `${asString(f.code)} ${asString(f.building)}-${asString(f.room)}` })))).catch(() => setRooms([]));
  }, [open, occurrence, initialDate, initialStart]);

  const body = occurrence && date && start ? {
    sectionId: occurrence.section?.id, originalDate: occurrence.date, originalStart: formatMinutes(occurrence.start),
    newDate: date, newStart: start, ...(facilityId ? { facilityId } : {}),
  } : null;

  React.useEffect(() => {
    if (!open || !body) return;
    let alive = true;
    api.classMoves.check(body)
      .then((r) => { if (alive) { setCheck(r as unknown as CheckResult); setCheckError(''); } })
      .catch((e) => { if (alive) { setCheck(null); setCheckError(e instanceof Error ? e.message : 'check failed'); } });
    return () => { alive = false; };
  }, [open, JSON.stringify(body)]);

  const blocked = !!check && (check.roomClashes.length > 0 || check.lecturerClashes.length > 0);
  const canSubmit = !!body && !!check && !blocked && reason.trim().length > 0 && !saving;
  const range = (c: Clash) => `${c.label} ${formatMinutes(c.start)}–${formatMinutes(c.end)}`;

  const submit = async () => {
    if (!body) return;
    setSaving(true);
    try {
      await api.classMoves.create({ ...body, reason });
      toast.success(mode === 'move' ? (isTH ? 'ย้ายคาบแล้ว' : 'Class moved') : (isTH ? 'ส่งคำขอแล้ว รอ staff อนุมัติ' : 'Request sent'));
      onOpenChange(false);
      onDone();
    } catch (error) {
      // keep the dialog and what was typed; say why
      toast.error(isTH ? 'บันทึกไม่สำเร็จ' : 'Could not save', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  if (!occurrence) return null;
  const dayName = DAY_LABELS[occurrence.day];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'move' ? (isTH ? 'ย้ายคาบเฉพาะครั้ง' : 'Move one class') : (isTH ? 'ขอย้ายคาบ' : 'Ask to move a class')}</DialogTitle>
          <DialogDescription>
            {occurrence.course.code}{occurrence.section ? ` ${isTH ? 'ตอน' : 'sec'} ${occurrence.section.sectionNumber}` : ''} · {isTH ? dayName.th : dayName.en} {occurrence.date} {formatMinutes(occurrence.start)}–{formatMinutes(occurrence.end)} · {occurrence.slot.room || occurrence.section?.room || '-'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Label>{isTH ? 'วันใหม่' : 'New day'}<Input data-testid="move-date" type="date" min={addDays(thaiToday(), 1)} value={date} onChange={(e) => setDate(e.target.value)} /></Label>
          <Label>{isTH ? 'เวลาเริ่ม' : 'Start'}
            <select data-testid="move-start" className="mt-1 w-full rounded-md border p-2 dark:bg-slate-900" value={start} onChange={(e) => setStart(e.target.value)}>
              {START_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Label>
          <Label>{isTH ? 'ห้อง' : 'Room'}
            <select data-testid="move-room" className="mt-1 w-full rounded-md border p-2 dark:bg-slate-900" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              <option value="">{isTH ? 'ห้องเดิม' : 'Usual room'}</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Label>
          <Label>{isTH ? 'เหตุผล' : 'Reason'}<Textarea data-testid="move-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Label>
          {check && <p className="text-sm text-slate-600 dark:text-slate-300">{isTH ? `จบ ${check.newEnd} · ห้อง ${check.room}` : `Ends ${check.newEnd} · room ${check.room}`}</p>}
          {checkError && <p data-testid="move-clash-block" className="text-sm text-red-600">🔴 {checkError}</p>}
          {check?.roomClashes.map((c) => <p key={`r${c.label}${c.start}`} data-testid="move-clash-block" className="text-sm text-red-600">🔴 {isTH ? `ห้องไม่ว่าง (${range(c)})` : `Room busy (${range(c)})`}</p>)}
          {check?.lecturerClashes.map((c) => <p key={`l${c.label}${c.start}`} data-testid="move-clash-block" className="text-sm text-red-600">🔴 {isTH ? `อาจารย์มีคาบ ${range(c)}` : `Lecturer teaches ${range(c)}`}</p>)}
          {check?.studentClashes.map((c) => <p key={`s${c.courseCode}`} data-testid="move-clash-warn" className="text-sm text-amber-600">🟡 {isTH ? `นักศึกษา ${c.count} คนชนกับ ${c.courseCode}` : `${c.count} students also have ${c.courseCode}`}</p>)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isTH ? 'ยกเลิก' : 'Cancel'}</Button>
          <Button data-testid="move-submit" disabled={!canSubmit} onClick={submit}>{mode === 'move' ? (isTH ? 'ย้ายคาบ' : 'Move') : (isTH ? 'ส่งคำขอ' : 'Send request')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: หน้า**
  1. `Schedule.tsx` (อาจารย์): ส่ง `onSlotClick={(o) => setMoveTarget(o)}` ให้ `WeeklyTimetable` · `<ClassMoveDialog mode="request" occurrence={moveTarget} … onDone={reloadMoves} />` · บล็อกที่มี move `pending` ของคาบนั้นวันนั้น (หาใน `moves`) แสดงป้าย "รออนุมัติ" + ปุ่ม "ถอนคำขอ" (`api.classMoves.withdraw`) — ส่ง `pendingByKey` เข้า `WeeklyTimetable` ผ่าน prop `badges?: Record<string, ReactNode>` ที่ key = `${sectionId}|${date}|${HH:MM}`
  2. `ScheduleManagement.tsx`: Tabs/ToggleGroup `data-testid="mode-weekly"` / `mode-recurring` · รับ `?week=` · โหมดรายสัปดาห์: `DraggableSchedule` ได้ `weekStart` + `moves` (โหลดตามสัปดาห์) + `onMove={(o, day, start) => เปิด ClassMoveDialog mode="move" initialDate={วันที่ของ day ในสัปดาห์นั้น} initialStart={formatMinutes(start)}}` + `onSlotClick={(o) => o.kind === 'moved-in' ? เปิดรายละเอียด + ปุ่ม "ยกเลิกการย้าย" (api.classMoves.cancel) : เปิด ClassMoveDialog mode="move"}` · โหมดประจำ: เหมือน F3a แต่ถ้า `api.courses.update` โยน error ที่มี `details` เป็น array ของ `moveId` → เปิด dialog รายการ "ต้องยกเลิกการย้ายเหล่านี้ก่อน" (แต่ละแถว: วันเดิม → วันใหม่ + ปุ่มยกเลิก) — `ApiError` ใน `api.ts` มี `details` อยู่แล้ว ใช้ `error instanceof ApiError && Array.isArray(error.details)`
  3. แผงคำขอ: แทนแผง F3a ทั้งก้อน · โหลด `api.classMoves.pending()` · แต่ละรายการ `data-testid="move-request"`: ผู้ยื่น (ชื่อจาก `requestedById` → แสดงอาจารย์ของวิชา `courseName`/lecturer), `courseCode` ตอน `sectionNumber`, `originalDate originalStart–originalEnd → newDate newStart–newEnd`, ห้อง, เหตุผล, ผลเช็คล่าสุด (เรียก `api.classMoves.check` ด้วยค่าของคำขอ; 🔴/🟡 แบบ dialog), ปุ่ม "อนุมัติ" (disabled ถ้า 🔴) และ "ปฏิเสธ" (เปิด prompt ให้กรอกเหตุผล ใช้ `Dialog` เล็ก) · หลังกด reload รายการ · ข้อความว่าง: "ไม่มีคำขอย้ายคาบ"
  4. `DraggableSchedule.tsx`: ถ้ามี `weekStart` ใช้ `weekOccurrences` แทน `placeSlots` และแสดงหัวคอลัมน์มีวันที่ · บล็อก `moved-out` ไม่ draggable · `onMove(o, day, start)` · `onSlotClick?(o)`

- [ ] **Step 5: รันทั้งหมด** — รีสตาร์ต backend dev แล้ว:
  - `npx vitest run src/lib` → ผ่าน (`import-mapping` เดิม)
  - `npx playwright test` → ผ่านทั้งหมด (เดิม 40 + ใหม่ 3)
  - `npm run build` → ผ่าน · `cd backend && npm test` → ผ่าน
- [ ] **Step 6: Commit** — ข้าม (Por: frontend ก้อนที่ 2 = Task 5–6)

---

## นอกขอบเขต

- งดคาบ / เปลี่ยนห้องอย่างเดียว / อีเมล / .ics / ย้ายหลายคาบพร้อมกัน (spec ข้อ 5)
- ห้องชนกับวิชาของเทอมอื่นเมื่อย้ายไปวันที่อยู่นอกเทอมของวิชาต้นทาง — ข้อจำกัดที่รู้ (spec ข้อ 4 นับคาบประจำเทอมเดียวกัน)
- การเช็คชื่อของคาบที่ย้าย: ทำได้อยู่แล้วตามวันใหม่ (F5) — ไม่มีการเชื่อมหน้าเช็คชื่อกับตารางรายสัปดาห์
