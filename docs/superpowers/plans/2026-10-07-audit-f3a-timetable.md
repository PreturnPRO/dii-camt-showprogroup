# Audit F3a: ตารางเรียนแสดงถูกและไม่โกหก Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ตารางเรียนทุกหน้าแสดงคาบที่เริ่ม :30, คาบเสาร์–อาทิตย์, คาบที่ซ้อนกัน และ section ที่นักศึกษาลงจริง เฉพาะเทอมที่เลือก · ตัวเลขชั่วโมง/วันเรียนคิดจากคาบจริง · ปุ่ม/แผงที่บันทึกไม่ได้ถูกเอาออกหรือบอกตามจริง · staff ลากย้ายคาบได้ถาวรแบบรักษานาที และตัวเลือก "เฉพาะครั้ง" ถูกซ่อนจนกว่า F3b จะทำของจริง

**Architecture:** frontend ล้วน (backend ไม่แตะ — F4 แก้ให้แก้ section ทับของเดิมตาม number แล้ว) · โมดูล pure `src/lib/timetable.ts` (จัดวางคาบตามนาทีและเลนซ้อน, เลือก section ที่ลงจริง, รายการเทอม, ชั่วโมงต่อสัปดาห์) ใช้ร่วมกันโดย `Timetable` (ดูอย่างเดียว) และ `DraggableSchedule` (staff) · หน้าใช้ term จาก `/enrollments/summary` (นักศึกษา) หรือ term selector (อาจารย์/staff, ค่าตั้งต้นเทอมใหม่สุด)

**Tech Stack:** React 18, Vitest, Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` F3 · `4-frontend-student.md` ("Schedule: timetable drops :30 classes; move-class is a fake toast", "totalHours = studentCourses.length * 3", "Only sections[0].schedule is shown") · `5-frontend-lecturer-staff.md` (ScheduleManagement drag/drop + "one-time" permanent; fake request approval; DraggableSchedule hides classes) · **การตัดสินของ Por 7/10/69:**
- โหมด "แก้ไข/ขอย้ายคาบ" ของนักศึกษา/อาจารย์ = เอาออก (ดูอย่างเดียว)
- แผงคำขอย้ายคาบของ staff = แสดงคำร้องจริงตามที่มันเป็น + ปุ่มไปหน้าคำร้อง · ตัดปุ่มอนุมัติ/ปฏิเสธ และเวลาเดิม/ใหม่ปลอม
- อาจารย์/staff มีตัวเลือกเทอม ค่าตั้งต้นเทอมใหม่สุด · นักศึกษาใช้เทอมปัจจุบันของตัวเอง
- ย้ายคาบเฉพาะครั้ง = ทำของจริงใน F3b (แยกออกแบบ) → **F3a ซ่อนตัวเลือกนี้** เพื่อไม่ให้มันเปลี่ยนถาวรแบบหลอก

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `2bdd318`) · **ห้าม commit/push ระหว่างรัน** — Por อนุมัติตอนจบ
- ไม่มี migration · ไม่แก้ backend
- ข้อความไทยห้าม letter-spacing (ห้ามใส่ `tracking-*` บนข้อความไทยใหม่) · ตัวเลขบนจอบอกหน่วย/ขอบเขต
- วัน: `monday … sunday` (lowercase) · เวลา "HH:MM" 24 ชม. เวลาไทย
- E2E ใช้ dev DB · ข้อมูลที่ E2E สร้างต้องเก็บกวาด enrollment (ถอน) ไม่งั้นหน่วยกิตของ chompoo สะสมจนชนเพดาน 22 ใน E2E ของ F4

**Seed:** DII340 section 01 จันทร์ 09:00–12:00 · ทุกวิชา/นักศึกษาเทอม 1/2569 · narin สอน DII340, mali สอน DII420 · staff `staff@showpro.local` · รหัส `Password123!`

## Review Focus

1. คาบ 09:30–11:00 ต้องอยู่ตำแหน่ง 09:30 จริงและไม่ทำให้คอลัมน์อื่นในตารางเลื่อน (Task 1, Task 2)
2. สองวิชาเวลาซ้อนกันวันเดียวกัน ต้องเห็นทั้งคู่ (Task 1, Task 2, Task 3)
3. นักศึกษาลง section 02 → ตารางแสดงเวลาของ section 02 ไม่ใช่ 01 (Task 1, Task 2)
4. staff ลากคาบ 09:30–11:00 ไปเริ่ม 13:00 → ได้ 13:00–14:30 (รักษานาที) และนักศึกษายังอยู่ section เดิม (Task 3)
5. วิชาเทอมเก่าไม่โผล่ในตารางเทอมปัจจุบัน (Task 1, Task 2)

---

### Task 1: โมดูลจัดวางตาราง (pure)

**Files:**
- Create: `src/lib/timetable.ts`, `src/lib/timetable.test.ts`

**Interfaces — Produces:**
- `DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const` · `type DayKey`
- `DAY_LABELS: Record<DayKey, { th: string; en: string; short: string }>`
- `toMinutes(hhmm: string): number | null` — null ถ้ารูปแบบผิด
- `formatMinutes(min: number): string` — "HH:MM"
- `type TimetableEntry = { course: Course; section: Section | null }`
- `type PlacedSlot = { key: string; course: Course; section: Section | null; slot: Schedule; day: DayKey; start: number; end: number; lane: number; lanes: number }`
- `placeSlots(entries: TimetableEntry[]): PlacedSlot[]` — คาบที่วัน/เวลาผิดหรือ end ≤ start ถูกทิ้ง · คาบที่ซ้อนกันในวันเดียวกันได้ lane ต่างกัน และ `lanes` = จำนวนเลนของกลุ่มที่ซ้อนกัน
- `visibleRange(slots: PlacedSlot[]): { start: number; end: number }` — ครอบ 08:00–18:00 เสมอ และขยายเป็นชั่วโมงเต็มให้ครอบคาบทุกคาบ
- `weeklyMinutes(slots: PlacedSlot[]): number` · `studyDays(slots: PlacedSlot[]): DayKey[]` (เรียงจันทร์→อาทิตย์)
- `type Term = { semester: number; academicYear: string }` · `termKey(t: Term): string` (`"2569/1"`) · `termsOf(courses: Course[]): Term[]` (ไม่ซ้ำ ใหม่→เก่า) · `inTerm(course: Course, term: Term | null): boolean`
- `enrolledSection(course: Course, sectionId: string | null | undefined): Section | null` — section ตาม id · ถ้าไม่มี id และวิชามี section เดียว ใช้อันนั้น · นอกนั้น null
- `studentEntries(enrollments: unknown[], term: Term | null): TimetableEntry[]` — จาก `GET /enrollments` (ไม่มีวิชาที่ถอน) เฉพาะเทอม
- `teachingEntries(courses: Course[], term: Term | null): TimetableEntry[]` — ทุก section ของวิชาในเทอม (วิชาไม่มี section → ไม่มีคาบ)

- [ ] **Step 1: เทสต์ที่ fail** — `src/lib/timetable.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import type { Course, Section } from '@/types';
import {
  enrolledSection, inTerm, placeSlots, studentEntries, studyDays, teachingEntries, termsOf, toMinutes, visibleRange, weeklyMinutes,
} from './timetable';

const slot = (day: string, startTime: string, endTime: string) => ({ id: `${day}${startTime}`, day, dayThai: '', startTime, endTime, type: 'lecture' }) as never;
const section = (id: string, slots: unknown[]): Section => ({ id, sectionNumber: id, maxStudents: 30, enrolledStudents: [], schedule: slots as never });
const course = (id: string, sections: Section[], semester = 1, academicYear = '2569') =>
  ({ id, code: id, name: id, nameThai: id, credits: 3, semester, academicYear, sections } as unknown as Course);

describe('toMinutes', () => {
  it('parses HH:MM and rejects junk', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('9:5')).toBeNull();
    expect(toMinutes('25:00')).toBeNull();
  });
});

describe('placeSlots', () => {
  it('keeps :30 starts, weekends and drops broken slots', () => {
    const placed = placeSlots([{ course: course('A', []), section: section('01', [slot('thursday', '09:30', '11:00'), slot('saturday', '08:00', '10:00'), slot('monday', '12:00', '11:00')]) }]);
    expect(placed.map((p) => [p.day, p.start, p.end])).toEqual([['thursday', 570, 660], ['saturday', 480, 600]]);
  });

  it('puts overlapping classes side by side', () => {
    const placed = placeSlots([
      { course: course('A', []), section: section('a', [slot('monday', '09:00', '12:00')]) },
      { course: course('B', []), section: section('b', [slot('monday', '10:00', '11:00')]) },
      { course: course('C', []), section: section('c', [slot('monday', '13:00', '14:00')]) },
    ]);
    const by = Object.fromEntries(placed.map((p) => [p.course.code, p]));
    expect([by.A.lane, by.B.lane]).toEqual([0, 1]);
    expect([by.A.lanes, by.B.lanes, by.C.lanes]).toEqual([2, 2, 1]);
  });
});

describe('range, hours and days', () => {
  it('covers 08:00-18:00 and stretches to whole hours around every class', () => {
    const placed = placeSlots([{ course: course('A', []), section: section('01', [slot('monday', '07:30', '09:00'), slot('friday', '18:00', '19:15')]) }]);
    expect(visibleRange(placed)).toEqual({ start: 420, end: 1200 });
    expect(visibleRange([])).toEqual({ start: 480, end: 1080 });
    expect(weeklyMinutes(placed)).toBe(90 + 75);
    expect(studyDays(placed)).toEqual(['monday', 'friday']);
  });
});

describe('terms and sections', () => {
  it('lists terms newest first and filters by term', () => {
    const courses = [course('A', [], 1, '2568'), course('B', [], 2, '2568'), course('C', [], 1, '2569'), course('D', [], 1, '2569')];
    expect(termsOf(courses)).toEqual([{ semester: 1, academicYear: '2569' }, { semester: 2, academicYear: '2568' }, { semester: 1, academicYear: '2568' }]);
    expect(inTerm(courses[0], { semester: 1, academicYear: '2569' })).toBe(false);
    expect(inTerm(courses[0], null)).toBe(false);
  });

  it('uses the section the student is in', () => {
    const c = course('A', [section('s1', []), section('s2', [])]);
    expect(enrolledSection(c, 's2')?.id).toBe('s2');
    expect(enrolledSection(c, null)).toBeNull();
    expect(enrolledSection(course('B', [section('only', [])]), null)?.id).toBe('only');
  });

  it('builds student entries from enrollments of the term only', () => {
    const enrollments = [
      { sectionId: 's2', course: { id: 'A', code: 'A', semester: 1, academicYear: '2569', sections: [{ id: 's1', number: '01', schedule: [] }, { id: 's2', number: '02', schedule: [{ day: 'tuesday', startTime: '13:00', endTime: '15:00' }] }] } },
      { sectionId: 'x', course: { id: 'OLD', code: 'OLD', semester: 2, academicYear: '2568', sections: [{ id: 'x', number: '01', schedule: [] }] } },
    ];
    const entries = studentEntries(enrollments, { semester: 1, academicYear: '2569' });
    expect(entries.map((e) => [e.course.code, e.section?.id])).toEqual([['A', 's2']]);
    expect(placeSlots(entries).map((p) => p.day)).toEqual(['tuesday']);
  });

  it('teaching entries include every section of the term', () => {
    const entries = teachingEntries([course('A', [section('s1', []), section('s2', [])]), course('OLD', [section('o', [])], 1, '2568')], { semester: 1, academicYear: '2569' });
    expect(entries.map((e) => e.section?.id)).toEqual(['s1', 's2']);
  });
});
```

- [ ] **Step 2: รันให้ fail** — `npx vitest run src/lib/timetable.test.ts` → FAIL (หาโมดูลไม่เจอ)

- [ ] **Step 3: เขียนโมดูล** — `src/lib/timetable.ts`

```ts
import type { Course, Schedule, Section } from '@/types';
import { asRecord } from '@/lib/live-data';
import { mapCourse } from '@/lib/live-mappers';

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, { th: string; en: string; short: string }> = {
  monday: { th: 'จันทร์', en: 'Monday', short: 'จ.' },
  tuesday: { th: 'อังคาร', en: 'Tuesday', short: 'อ.' },
  wednesday: { th: 'พุธ', en: 'Wednesday', short: 'พ.' },
  thursday: { th: 'พฤหัสบดี', en: 'Thursday', short: 'พฤ.' },
  friday: { th: 'ศุกร์', en: 'Friday', short: 'ศ.' },
  saturday: { th: 'เสาร์', en: 'Saturday', short: 'ส.' },
  sunday: { th: 'อาทิตย์', en: 'Sunday', short: 'อา.' },
};

export const toMinutes = (hhmm: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? h * 60 + m : null;
};

export const formatMinutes = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export type TimetableEntry = { course: Course; section: Section | null };
export type PlacedSlot = {
  key: string; course: Course; section: Section | null; slot: Schedule;
  day: DayKey; start: number; end: number; lane: number; lanes: number;
};

export const placeSlots = (entries: TimetableEntry[]): PlacedSlot[] => {
  const raw: PlacedSlot[] = [];
  entries.forEach(({ course, section }) => {
    (section?.schedule ?? []).forEach((slot, index) => {
      const day = String(slot.day ?? '').trim().toLowerCase() as DayKey;
      const start = toMinutes(slot.startTime);
      const end = toMinutes(slot.endTime);
      if (!DAY_KEYS.includes(day) || start === null || end === null || end <= start) return;
      raw.push({ key: `${course.id}-${section?.id ?? 'none'}-${index}`, course, section, slot, day, start, end, lane: 0, lanes: 1 });
    });
  });

  // lanes per day: classes that overlap (directly or through a chain) share a group
  for (const day of DAY_KEYS) {
    const daySlots = raw.filter((p) => p.day === day).sort((a, b) => a.start - b.start || a.end - b.end);
    let group: PlacedSlot[] = [];
    let groupEnd = -1;
    const close = () => {
      const lanes = Math.max(1, ...group.map((p) => p.lane + 1));
      group.forEach((p) => { p.lanes = lanes; });
      group = [];
    };
    for (const p of daySlots) {
      if (group.length && p.start >= groupEnd) close();
      const laneEnds: number[] = [];
      group.forEach((g) => { laneEnds[g.lane] = Math.max(laneEnds[g.lane] ?? -1, g.end); });
      let lane = laneEnds.findIndex((end) => end <= p.start);
      if (lane === -1) lane = laneEnds.length;
      p.lane = lane;
      group.push(p);
      groupEnd = Math.max(groupEnd, p.end);
    }
    if (group.length) close();
  }
  return raw.sort((a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day) || a.start - b.start);
};

export const visibleRange = (slots: PlacedSlot[]) => ({
  start: Math.min(8 * 60, ...slots.map((s) => Math.floor(s.start / 60) * 60)),
  end: Math.max(18 * 60, ...slots.map((s) => Math.ceil(s.end / 60) * 60)),
});

export const weeklyMinutes = (slots: PlacedSlot[]) => slots.reduce((sum, s) => sum + (s.end - s.start), 0);
export const studyDays = (slots: PlacedSlot[]): DayKey[] => DAY_KEYS.filter((d) => slots.some((s) => s.day === d));

export type Term = { semester: number; academicYear: string };
export const termKey = (t: Term) => `${t.academicYear}/${t.semester}`;

export const termsOf = (courses: Course[]): Term[] => {
  const seen = new Map<string, Term>();
  courses.forEach((c) => {
    const t = { semester: Number(c.semester), academicYear: String(c.academicYear) };
    seen.set(termKey(t), t);
  });
  return Array.from(seen.values()).sort((a, b) => Number(b.academicYear) - Number(a.academicYear) || b.semester - a.semester);
};

export const inTerm = (course: Course, term: Term | null) =>
  !!term && Number(course.semester) === term.semester && String(course.academicYear) === term.academicYear;

export const enrolledSection = (course: Course, sectionId: string | null | undefined): Section | null => {
  if (sectionId) return course.sections.find((s) => s.id === sectionId) ?? null;
  return course.sections.length === 1 ? course.sections[0] : null;
};

/** rows from GET /enrollments (dropped already excluded by the API) */
export const studentEntries = (enrollments: unknown[], term: Term | null): TimetableEntry[] =>
  enrollments
    .map((item, index) => {
      const enrollment = asRecord(item);
      const course = mapCourse(enrollment.course, index);
      const sectionId = typeof enrollment.sectionId === 'string' ? enrollment.sectionId : null;
      return { course, section: enrolledSection(course, sectionId) };
    })
    .filter((e) => inTerm(e.course, term));

export const teachingEntries = (courses: Course[], term: Term | null): TimetableEntry[] =>
  courses.filter((c) => inTerm(c, term)).flatMap((course) => course.sections.map((section) => ({ course, section })));
```

- [ ] **Step 4: รันให้ผ่าน** — คำสั่งเดิม → PASS
- [ ] **Step 5: Commit** — ข้าม

---

### Task 2: ตารางแบบดูอย่างเดียว + หน้าที่ใช้

**Files:**
- Modify: `src/components/common/Timetable.tsx` (เขียนใหม่ทั้งไฟล์)
- Modify: `src/pages/Schedule.tsx` (นักศึกษา + อาจารย์: entries, term, ตัดโหมดแก้ไข/ปุ่มสัปดาห์, สถิติจริง)
- Modify: `src/pages/PersonalDashboard.tsx`, `src/pages/dashboards/StudentDashboard.tsx` (2 จุด), `src/pages/dashboards/LecturerDashboard.tsx`
- Create: `e2e/timetable.spec.ts`

**Interfaces:**
- Consumes: Task 1 · `api.enrollments.summary()` (F4) สำหรับเทอมนักศึกษา
- Produces: `<Timetable entries={TimetableEntry[]} term={Term | null} />` — ไม่มี prop `courses/semester/academicYear` อีก · DOM: บล็อกคาบ `data-testid="timetable-slot"` พร้อม `data-course`, `data-day`, `data-start` ("HH:MM"), `data-lane`

- [ ] **Step 1: E2E ที่ fail** — `e2e/timetable.spec.ts`

```ts
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function token(request: APIRequestContext, email: string) {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/** two courses in chompoo's term that overlap on Thursday; chompoo is put in section 02 of the first */
async function setup(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers;
  const stamp = Date.now().toString(36).toUpperCase();
  const make = async (code: string, sections: unknown[]) => {
    const res = await request.post(`${API}/courses`, { headers: staff, data: {
      code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: lecturers[0].id, status: "active", sections,
    } });
    expect(res.ok()).toBeTruthy();
    return (await res.json()).course as { id: string; code: string; sections: Array<{ id: string; number: string }> };
  };
  const a = await make(`TTA${stamp}`, [
    { number: "01", maxStudents: 5, schedule: [{ day: "monday", startTime: "08:00", endTime: "09:00" }] },
    { number: "02", maxStudents: 5, schedule: [{ day: "thursday", startTime: "09:30", endTime: "11:00" }] },
  ]);
  const b = await make(`TTB${stamp}`, [{ number: "01", maxStudents: 5, schedule: [{ day: "saturday", startTime: "10:00", endTime: "11:00" }] }]);
  return { staff, a, b };
}

test("student timetable shows the enrolled section at :30, weekends, and only this term", async ({ page, request }) => {
  const { staff, a, b } = await setup(request);
  await login(page, "chompoo@student.showpro.local");
  const studentToken = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  for (const [course, sectionId] of [[a, a.sections.find((s) => s.number === "02")!.id], [b, b.sections[0].id]] as const) {
    const res = await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: course.id, sectionId } });
    expect(res.ok()).toBeTruthy();
  }
  try {
    await page.goto("/schedule");
    const slotA = page.locator(`[data-testid=timetable-slot][data-course="${a.code}"]`).first();
    await expect(slotA).toHaveAttribute("data-day", "thursday");
    await expect(slotA).toHaveAttribute("data-start", "09:30");
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${a.code}"][data-day=monday]`)).toHaveCount(0); // section 01's time
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${b.code}"]`).first()).toHaveAttribute("data-day", "saturday");
    await expect(page.getByRole("button", { name: /แก้ไขตาราง|Edit schedule|ขอย้าย/ })).toHaveCount(0);
  } finally {
    for (const course of [a, b]) await request.delete(`${API}/enrollments/course/${course.id}`, { headers: student });
  }
});

test("lecturer timetable has a term picker that defaults to the newest term", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.goto("/schedule");
  await expect(page.getByTestId("term-picker")).toContainText("1/2569");
  await expect(page.locator("[data-testid=timetable-slot][data-course=DII340]").first()).toHaveAttribute("data-start", "09:00");
});
```

> วิชาที่สร้างค้างใน dev DB (ไม่มีคนลงหลังเทสต์) ยอมรับได้ · `GET /students/profile` ของนักศึกษาคืน `profile.id` = StudentProfile id (`serializeStudentProfile`)

- [ ] **Step 2: รันให้ fail** — `npx playwright test e2e/timetable.spec.ts` → FAIL (ไม่มี `timetable-slot` / `term-picker`)

- [ ] **Step 3: เขียน `Timetable.tsx` ใหม่**

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DAY_LABELS, formatMinutes, placeSlots, studyDays, visibleRange, weeklyMinutes, type Term, type TimetableEntry } from '@/lib/timetable';

interface TimetableProps {
  entries: TimetableEntry[];
  term: Term | null;
}

const ROW_PX = 28; // one row = 30 minutes

export function Timetable({ entries, term }: TimetableProps) {
  const { language } = useLanguage();
  const isTH = language !== 'en';
  const placed = React.useMemo(() => placeSlots(entries), [entries]);
  const range = visibleRange(placed);
  const days = studyDays(placed).length > 0 && studyDays(placed).some((d) => d === 'saturday' || d === 'sunday')
    ? (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const)
    : (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const);
  const rows = (range.end - range.start) / 30;
  const hours = Array.from({ length: (range.end - range.start) / 60 }, (_, i) => range.start + i * 60);
  const uniqueCourses = new Map(entries.map((e) => [e.course.id, e.course]));
  const credits = Array.from(uniqueCourses.values()).reduce((sum, c) => sum + c.credits, 0);
  const weeklyHours = weeklyMinutes(placed) / 60;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl font-semibold">
            {term ? (isTH ? `ตารางประจำสัปดาห์ เทอม ${term.semester}/${term.academicYear}` : `Weekly timetable, term ${term.semester}/${term.academicYear}`) : (isTH ? 'ตารางประจำสัปดาห์' : 'Weekly timetable')}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{credits} {isTH ? 'หน่วยกิต' : 'credits'}</Badge>
            <Badge variant="secondary">{isTH ? `${weeklyHours} ชม./สัปดาห์` : `${weeklyHours} h/week`}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {placed.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{isTH ? 'ไม่มีคาบเรียนในเทอมนี้' : 'No classes this term'}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div />
              {days.map((day) => (
                <div key={day} className="border-b border-slate-200 p-2 text-center text-sm font-semibold dark:border-slate-700">
                  {isTH ? DAY_LABELS[day].th : DAY_LABELS[day].en}
                </div>
              ))}
              <div className="relative" style={{ height: rows * ROW_PX }}>
                {hours.map((h) => (
                  <div key={h} className="absolute right-2 text-xs text-slate-500 dark:text-slate-400" style={{ top: ((h - range.start) / 30) * ROW_PX - 7 }}>
                    {formatMinutes(h)}
                  </div>
                ))}
              </div>
              {days.map((day) => (
                <div key={day} className="relative border-l border-slate-100 dark:border-slate-800" style={{ height: rows * ROW_PX }}>
                  {hours.map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800" style={{ top: ((h - range.start) / 30) * ROW_PX }} />
                  ))}
                  {placed.filter((p) => p.day === day).map((p) => (
                    <div
                      key={p.key}
                      data-testid="timetable-slot"
                      data-course={p.course.code}
                      data-day={p.day}
                      data-start={formatMinutes(p.start)}
                      data-lane={p.lane}
                      className="absolute overflow-hidden rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      style={{
                        top: ((p.start - range.start) / 30) * ROW_PX,
                        height: ((p.end - p.start) / 30) * ROW_PX - 2,
                        left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / p.lanes}% - 4px)`,
                      }}
                    >
                      <div className="font-semibold text-blue-900 dark:text-slate-200">{p.course.code}{p.section ? ` (${isTH ? 'ตอน' : 'sec'} ${p.section.sectionNumber})` : ''}</div>
                      <div className="text-slate-600 dark:text-slate-300">{formatMinutes(p.start)}–{formatMinutes(p.end)}</div>
                      <div className="line-clamp-1 text-slate-700 dark:text-slate-300">{isTH ? p.course.nameThai || p.course.name : p.course.name}</div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><MapPin className="h-3 w-3" />{p.slot.room || p.section?.room || (isTH ? 'ไม่ระบุห้อง' : 'No room')}</div>
                      {p.course.lecturerName && <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><User className="h-3 w-3" /><span className="truncate">{p.course.lecturerName}</span></div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

> ลบ mobile list view เดิมทิ้งด้วย (ตารางนี้เลื่อนแนวนอนได้บนจอเล็กแล้ว) · `days` ใช้ 7 วันเมื่อมีคาบเสาร์/อาทิตย์ ไม่งั้น 5 วัน

- [ ] **Step 4: แก้หน้าที่ใช้ Timetable**

  1. **`Schedule.tsx` นักศึกษา**: โหลด `api.enrollments.summary()` คู่กับ `api.enrollments.list()` · เก็บ `enrollmentRows` (raw) และ `term = { semester: summary.semester, academicYear: summary.academicYear }` · `const entries = studentEntries(enrollmentRows, term)` · `placed = placeSlots(entries)` · การ์ดสถิติ: หน่วยกิต = ผลรวมของวิชาไม่ซ้ำใน entries, ชั่วโมง = `weeklyMinutes(placed) / 60` + "ชม./สัปดาห์", วันเรียน = `studyDays(placed)` เป็นตัวย่อไทย (`DAY_LABELS[d].short`) คั่นด้วยช่องว่าง หรือ `-` ถ้าไม่มี (แทน `t.schedulePage.monFri` และ `studentCourses.length * 3`) · "คาบวันนี้": ใช้ `placed.filter(p => p.day === DAY_KEYS[(new Date().getDay() + 6) % 7])` · `<Timetable entries={entries} term={term} />` · **ลบ**ปุ่มเลื่อนสัปดาห์ (`currentWeek`) และข้อความช่วงวันที่ของสัปดาห์ เพราะตารางเป็นแบบประจำสัปดาห์ (ตารางรายสัปดาห์จริงอยู่ใน F3b)
  2. **`Schedule.tsx` อาจารย์**: ลบ `isEditMode`, ปุ่มแก้ไข, แถบ "Complete editing mode…", `DraggableSchedule`, `handleRequestMove`, `scheduleItems` · เพิ่ม term picker:

  ```tsx
  const terms = React.useMemo(() => termsOf(courses), [courses]);
  const [termValue, setTermValue] = React.useState('');
  const term = terms.find((t) => termKey(t) === termValue) ?? terms[0] ?? null;
  // …
  <Select value={term ? termKey(term) : ''} onValueChange={setTermValue}>
    <SelectTrigger data-testid="term-picker" className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
    <SelectContent>
      {terms.map((t) => <SelectItem key={termKey(t)} value={termKey(t)}>{language === 'th' ? `เทอม ${t.semester}/${t.academicYear}` : `Term ${t.semester}/${t.academicYear}`}</SelectItem>)}
    </SelectContent>
  </Select>
  <Timetable entries={teachingEntries(courses, term)} term={term} />
  ```

  (ใน SelectValue ต้องแสดง "เทอม 1/2569" ให้ E2E หาเจอ `toContainText("1/2569")`)
  3. **`StudentDashboard.tsx`** (2 จุด) และ **`PersonalDashboard.tsx`**: ทั้งสองหน้าโหลด `api.enrollments.list()` และ `api.enrollments.summary()` อยู่แล้ว (F4) → เก็บ raw enrollments กับ term จาก summary ใน state แล้วส่ง `<Timetable entries={studentEntries(enrollmentRows, term)} term={term} />` · ถ้า summary ไม่ได้ → `term = null` (ตารางขึ้น "ไม่มีคาบเรียนในเทอมนี้")
  4. **`LecturerDashboard.tsx`**: `const term = termsOf(courses)[0] ?? null;` → `<Timetable entries={teachingEntries(courses, term)} term={term} />`
  5. grep `<Timetable` ทั้ง repo ต้องไม่เหลือ prop `courses=`

- [ ] **Step 5: รันให้ผ่าน** — `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "Timetable|Schedule.tsx|Dashboard"` → ไม่มี error ใหม่ · รีสตาร์ต backend dev แล้ว `npx playwright test e2e/timetable.spec.ts` → PASS
- [ ] **Step 6: Commit** — ข้าม

---

### Task 3: หน้าจัดตารางของ staff

**Files:**
- Modify: `src/components/schedule/DraggableSchedule.tsx` (เขียนใหม่ทั้งไฟล์), `src/components/schedule/RescheduleDialog.tsx` (เหลือแบบถาวร)
- Modify: `src/pages/ScheduleManagement.tsx` (term picker, day 1–7, ย้ายรักษานาที, แผงคำร้อง)
- Modify: `src/pages/Schedule.tsx` (ไม่ใช้ `DraggableSchedule` แล้ว — ลบ import ถ้ายังเหลือ)
- Modify: `e2e/timetable.spec.ts` (เพิ่มเทสต์ staff)

**Interfaces:**
- Consumes: Task 1 (`placeSlots`, `visibleRange`, `DAY_KEYS`, `DAY_LABELS`, `formatMinutes`, `toMinutes`, `termsOf`, `termKey`, `inTerm`)
- Produces: `DraggableSchedule` props `{ entries: TimetableEntry[]; editable: boolean; onMove: (p: PlacedSlot, day: DayKey, start: number) => void }` · drop target ทุก 30 นาที `data-testid="drop-{day}-{HH:MM}"` · บล็อกคาบ `data-testid="timetable-slot"` (attribute เหมือน Task 2) · `RescheduleDialog` props `{ open, onOpenChange, onConfirm: () => void, courseCode: string, fromLabel: string, toLabel: string }`

- [ ] **Step 1: E2E ที่ fail** — ต่อท้าย `e2e/timetable.spec.ts`

```ts
test("staff move keeps minutes, keeps the student's section, and offers no fake one-time move", async ({ page, request }) => {
  const { staff, a } = await setup(request);
  const sec02 = a.sections.find((s) => s.number === "02")!;
  const studentToken = await token(request, "chompoo@student.showpro.local");
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: a.id, sectionId: sec02.id } })).ok()).toBeTruthy();
  try {
    await login(page, "staff@showpro.local");
    await page.goto("/schedule-management");
    await expect(page.getByTestId("term-picker")).toContainText("1/2569");
    await page.locator("#edit-mode").click(); // the "แก้ไขตาราง" switch
    const slot = page.locator(`[data-testid=timetable-slot][data-course="${a.code}"][data-day=thursday]`);
    await slot.dragTo(page.getByTestId("drop-thursday-13:00"));
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(/ทุกสัปดาห์|every week/);
    await expect(dialog.getByText(/เฉพาะ|one-time/i)).toHaveCount(0);
    await dialog.getByRole("button", { name: /ยืนยัน|Confirm/ }).click();

    await expect.poll(async () => {
      const course = (await (await request.get(`${API}/courses/${a.id}`, { headers: staff })).json()).course;
      return course.sections.find((s: { number: string }) => s.number === "02").schedule[0];
    }).toMatchObject({ day: "thursday", startTime: "13:00", endTime: "14:30" });
    const mine = (await (await request.get(`${API}/enrollments`, { headers: student })).json()).enrollments.find((e: { courseId: string }) => e.courseId === a.id);
    expect(mine.sectionId).toBe(sec02.id);
  } finally {
    await request.delete(`${API}/enrollments/course/${a.id}`, { headers: student });
  }
});

test("schedule requests panel shows real requests and only links to them", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/schedule-management");
  const panel = page.getByTestId("schedule-requests");
  await expect(panel.getByRole("button", { name: /อนุมัติ|Approve|ปฏิเสธ|Reject/ })).toHaveCount(0);
  await expect(panel.getByText(/^-\s*→\s*-$/)).toHaveCount(0);
});
```

> `GET /courses/:id` คืน `sections` พร้อม `schedule` (`getCourseById` include sections) · โหมดแก้ไขของ staff คือ `<Switch id="edit-mode">`

- [ ] **Step 2: รันให้ fail** — `npx playwright test e2e/timetable.spec.ts -g "staff|requests panel"` → FAIL

- [ ] **Step 3: `RescheduleDialog.tsx` ใหม่**

```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface RescheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    courseCode: string;
    fromLabel: string;
    toLabel: string;
}

/** only permanent moves exist until per-date changes are built (F3b) */
export function RescheduleDialog({ open, onOpenChange, onConfirm, courseCode, fromLabel, toLabel }: RescheduleDialogProps) {
    const { language } = useLanguage();
    const isTH = language !== 'en';
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isTH ? `ย้ายคาบ ${courseCode}` : `Move ${courseCode}`}</DialogTitle>
                    <DialogDescription>
                        {isTH
                            ? `${fromLabel} → ${toLabel} · มีผลทุกสัปดาห์ของเทอม นักศึกษาที่ลงตอนนี้จะเห็นเวลาใหม่ทันที`
                            : `${fromLabel} → ${toLabel} · applies every week of the term; enrolled students see the new time right away`}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{isTH ? 'ยกเลิก' : 'Cancel'}</Button>
                    <Button onClick={onConfirm}>{isTH ? 'ยืนยันย้าย' : 'Confirm'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 4: `DraggableSchedule.tsx` ใหม่** — ใช้ layout เดียวกับ `Timetable` (คอลัมน์ต่อวัน, absolute ตามนาที, เลนซ้อน, 7 วันเสมอสำหรับ staff) และเพิ่มช่อง drop:

```tsx
import React from 'react';
import { MapPin, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { RescheduleDialog } from './RescheduleDialog';
import { DAY_KEYS, DAY_LABELS, formatMinutes, placeSlots, visibleRange, type DayKey, type PlacedSlot, type TimetableEntry } from '@/lib/timetable';

interface DraggableScheduleProps {
    entries: TimetableEntry[];
    editable: boolean;
    onMove: (slot: PlacedSlot, day: DayKey, start: number) => void;
}

const ROW_PX = 28;

export function DraggableSchedule({ entries, editable, onMove }: DraggableScheduleProps) {
    const { language } = useLanguage();
    const isTH = language !== 'en';
    const placed = React.useMemo(() => placeSlots(entries), [entries]);
    const range = visibleRange(placed);
    const rows = (range.end - range.start) / 30;
    const [dragged, setDragged] = React.useState<PlacedSlot | null>(null);
    const [over, setOver] = React.useState<string | null>(null);
    const [pending, setPending] = React.useState<{ slot: PlacedSlot; day: DayKey; start: number } | null>(null);
    const label = (day: DayKey, start: number, end?: number) =>
        `${isTH ? DAY_LABELS[day].th : DAY_LABELS[day].en} ${formatMinutes(start)}${end !== undefined ? `–${formatMinutes(end)}` : ''}`;

    return (
        <>
            <div className="overflow-x-auto">
                <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))` }}>
                    <div />
                    {DAY_KEYS.map((day) => (
                        <div key={day} className="border-b border-slate-200 p-2 text-center text-sm font-semibold dark:border-slate-700">{isTH ? DAY_LABELS[day].th : DAY_LABELS[day].en}</div>
                    ))}
                    <div className="relative" style={{ height: rows * ROW_PX }}>
                        {Array.from({ length: rows / 2 }, (_, i) => range.start + i * 60).map((h) => (
                            <div key={h} className="absolute right-2 text-xs text-slate-500 dark:text-slate-400" style={{ top: ((h - range.start) / 30) * ROW_PX - 7 }}>{formatMinutes(h)}</div>
                        ))}
                    </div>
                    {DAY_KEYS.map((day) => (
                        <div key={day} className="relative border-l border-slate-100 dark:border-slate-800" style={{ height: rows * ROW_PX }}>
                            {editable && Array.from({ length: rows }, (_, i) => range.start + i * 30).map((start) => {
                                const id = `${day}-${formatMinutes(start)}`;
                                return (
                                    <div
                                        key={id}
                                        data-testid={`drop-${id}`}
                                        className={cn('absolute inset-x-0 border-t border-dashed border-slate-100 dark:border-slate-800', over === id && 'bg-blue-100 dark:bg-slate-700')}
                                        style={{ top: ((start - range.start) / 30) * ROW_PX, height: ROW_PX }}
                                        onDragOver={(e) => { e.preventDefault(); setOver(id); }}
                                        onDragLeave={() => setOver((cur) => (cur === id ? null : cur))}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setOver(null);
                                            if (dragged && !(dragged.day === day && dragged.start === start)) setPending({ slot: dragged, day, start });
                                            setDragged(null);
                                        }}
                                    />
                                );
                            })}
                            {placed.filter((p) => p.day === day).map((p) => (
                                <div
                                    key={p.key}
                                    data-testid="timetable-slot"
                                    data-course={p.course.code}
                                    data-day={p.day}
                                    data-start={formatMinutes(p.start)}
                                    data-lane={p.lane}
                                    draggable={editable}
                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.key); e.dataTransfer.effectAllowed = 'move'; setDragged(p); }}
                                    className={cn('absolute z-10 overflow-hidden rounded-lg border-l-4 border-l-blue-500 bg-white p-1.5 text-xs shadow-sm dark:bg-slate-800', editable && 'cursor-grab')}
                                    style={{
                                        top: ((p.start - range.start) / 30) * ROW_PX,
                                        height: ((p.end - p.start) / 30) * ROW_PX - 2,
                                        left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                                        width: `calc(${100 / p.lanes}% - 4px)`,
                                        pointerEvents: dragged && dragged.key !== p.key ? 'none' : undefined,
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{p.course.code}{p.section ? ` ${isTH ? 'ตอน' : 'sec'} ${p.section.sectionNumber}` : ''}</span>
                                        {editable && <GripVertical className="h-3 w-3 text-slate-400" />}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-300">{formatMinutes(p.start)}–{formatMinutes(p.end)}</div>
                                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><MapPin className="h-3 w-3" />{p.slot.room || p.section?.room || '-'}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <RescheduleDialog
                open={!!pending}
                onOpenChange={(open) => { if (!open) setPending(null); }}
                courseCode={pending?.slot.course.code ?? ''}
                fromLabel={pending ? label(pending.slot.day, pending.slot.start, pending.slot.end) : ''}
                toLabel={pending ? label(pending.day, pending.start, pending.start + (pending.slot.end - pending.slot.start)) : ''}
                onConfirm={() => { if (pending) onMove(pending.slot, pending.day, pending.start); setPending(null); }}
            />
        </>
    );
}
```

> ถ้า Playwright `dragTo` ไม่ยิง HTML5 drag events กับ `draggable` ได้ (บาง Chromium ต้อง `dispatchEvent`) ให้ใช้ `page.dispatchEvent` ลำดับ `dragstart`→`dragover`→`drop` ด้วย `DataTransfer` เดียวกันในเทสต์ และบันทึก ruling

- [ ] **Step 5: `ScheduleManagement.tsx`**
  1. เก็บ `courses: Course[] = coursesResponse.value.courses.map(mapCourse)` แทนการ map เป็น `ScheduleItem` เอง (ลบ `dayToIndex`, `dayNameByIndex`, `calculateEndTime`, `schedule` state, `ScheduleItem` import) · `courseRecords` (raw) เก็บไว้ใช้ตอนบันทึก
  2. term picker แบบเดียวกับ Task 2 Step 4.2 (`data-testid="term-picker"`) · `entries = teachingEntries(courses, term)` · `<DraggableSchedule entries={entries} editable={isEditMode} onMove={handleScheduleMove} />`
  3. `handleScheduleMove`:

  ```tsx
  const handleScheduleMove = async (p: PlacedSlot, day: DayKey, start: number) => {
      const record = asRecord(courseRecords.find((r) => asString(asRecord(r).id) === p.course.id));
      const slotIndex = p.section ? p.section.schedule.indexOf(p.slot) : -1;
      if (!p.section || slotIndex < 0) {
          toast.error(language === 'th' ? 'หาคาบนี้ในข้อมูลวิชาไม่เจอ' : 'Could not find this class in the course');
          return;
      }
      const nextSlot = { day, startTime: formatMinutes(start), endTime: formatMinutes(start + (p.end - p.start)) };
      // send every section by number: the API updates sections in place, so enrollments keep their section
      const sections = asArray(record.sections).map((item) => {
          const s = asRecord(item);
          const schedule = asArray(s.schedule).map((slot, i) =>
              asString(s.id) === p.section!.id && i === slotIndex ? { ...asRecord(slot), ...nextSlot } : asRecord(slot));
          return {
              number: asString(s.number),
              room: asString(s.room) || undefined,
              facilityId: asString(s.facilityId) || undefined,
              maxStudents: asNumber(s.maxStudents, 30),
              minStudents: asNumber(s.minStudents, 0),
              schedule,
          };
      });
      try {
          const response = await api.courses.update(p.course.id, { sections });
          const updated = asRecord(response.course);
          setCourseRecords((cur) => cur.map((r) => (asString(asRecord(r).id) === p.course.id ? updated : r)));
          setCourses((cur) => cur.map((c) => (c.id === p.course.id ? mapCourse(updated) : c)));
          toast.success(language === 'th' ? 'ย้ายคาบแล้ว (มีผลทุกสัปดาห์)' : 'Class moved (every week)');
      } catch (error) {
          toast.error(error instanceof Error ? error.message : (language === 'th' ? 'ย้ายคาบไม่สำเร็จ' : 'Could not move the class'));
      }
  };
  ```

  (`p.section.schedule.indexOf(p.slot)` ใช้ได้เพราะ `p.slot` คือ object เดียวกับใน `mapCourse` ของ `courses` · `api.courses.update` คืน `{ course }` · เปลี่ยน `const { t } = useLanguage();` เป็น `const { t, language } = useLanguage();` และเพิ่ม `const navigate = useNavigate();`)
  4. แผงคำขอ: ห่อด้วย `data-testid="schedule-requests"` · map คำร้องเป็น `{ id, submitter (ชื่อนักศึกษา), title, status, submittedAt }` (ไม่มี oldTime/newTime/lecturer/type ปลอม) · แสดง "ผู้ยื่น: …", หัวข้อ, สถานะ, วันที่ยื่น (`toLocaleDateString('th-TH')`) · ปุ่มเดียว `เปิดหน้าคำร้อง` → `navigate('/requests')` · ลบ `handleApprove`/`handleReject` · หัวแผงบอกว่าเป็น "คำร้องที่เกี่ยวกับตาราง/ห้อง (คัดจากคำในหัวข้อ)" เพื่อไม่ให้เข้าใจว่าเป็นระบบขอย้ายคาบ
- [ ] **Step 6: รันทั้งหมด** — รีสตาร์ต backend dev แล้ว:
  - `npx vitest run src/lib` → ผ่าน (`import-mapping` "No test suite" เดิม)
  - `npx playwright test` → ผ่านทั้งหมด (เดิม 35 + ใหม่ 4)
  - `npm run build` → ผ่าน · `cd backend && npm test` → ผ่าน (ไม่ได้แก้ backend แต่ยืนยัน)
  - grep `DraggableSchedule\|RescheduleDialog` ต้องเหลือแค่ ScheduleManagement + ตัวไฟล์เอง
- [ ] **Step 7: Commit** — ข้าม · Por อนุมัติแล้ว commit ก้อนเดียว (frontend+E2E+แผน) เพราะไม่มี backend

---

## นอกขอบเขต

- ย้ายคาบเฉพาะวัน + ตารางรายสัปดาห์ที่มีวันที่จริง → F3b (ต้องออกแบบ spec ก่อน)
- `mapSchedule` เติม 09:00–12:00/monday ให้คาบที่ข้อมูลขาด (ข้อมูลเสียจะดูเหมือนคาบจริง)
- หน้า Workload สร้างแถวตารางปลอม (`5-frontend-lecturer-staff.md` "Workload…") — กลุ่ม M
- ห้องชนกันตอนย้ายคาบ: backend `prepareCourseSections` ตรวจห้องชนในวิชาเดียวกันเท่านั้น
