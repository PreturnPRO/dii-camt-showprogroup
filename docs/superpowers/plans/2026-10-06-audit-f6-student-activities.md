# Audit F6: หน้ากิจกรรมของนักศึกษาใช้งานได้จริง (ซ่อนเช็คอินไว้ก่อน) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** นักศึกษาเห็นว่าตัวเองลงกิจกรรมไหนแล้ว เห็นแต้ม ชั่วโมง และ badge จริงของตัวเอง · leaderboard นับเฉพาะแต้มที่ได้จริงและไม่แสดงคนที่ไม่ยินยอม · ไม่มีตัวเลขหรือ badge ที่แต่งขึ้น · ปุ่มเช็คอินถูกซ่อนและ endpoint เช็คอินด้วยตัวเองถูกปิดจนกว่า Por จะเลือกวิธีเช็คอิน

**Architecture:** backend: ปิด `POST /activities/check-in/:id` (403) · `scopeActivityForViewer` ซ่อนตัวตนคนที่ตั้ง `showInLeaderboard=false` เมื่อผู้ดูเป็นนักศึกษาคนอื่น (ต้อง include consent ใน query) · timeline ของรางวัลกิจกรรมใช้เทอม/ปีการศึกษาของนักศึกษาแทนค่าตายตัว · frontend: `Activities.tsx` โหลดโปรไฟล์ + stats ของตัวเองแทน `/player/stats` (ไม่มีจริง) · ตัว leaderboard แยกเป็น pure function `src/lib/activity-leaderboard.ts`

**Tech Stack:** Express 4, Prisma 6, Vitest + supertest, React 18, Vitest, Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` F6 · `4-frontend-student.md` (/player/stats 404, student.id never set, leaderboard invented, fake numbers, UPDATE 5) · deferred minor จาก S-b1 (leaderboard ignores `showInLeaderboard`) · **การตัดสินของ Por 6/10/69:** แก้ F6 แต่ซ่อนปุ่มเช็คอินและปิด endpoint เช็คอินไว้ · ของที่ระบบไม่มีข้อมูลจริง = ซ่อน

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `074bdc3`) · ห้าม commit/push ระหว่างรัน — Por อนุมัติตอนจบ
- เทสต์ใช้ DB `showpro_main_test` เท่านั้น · ไม่มี migration
- ข้อความ error ภาษาอังกฤษ · ข้อความไทยห้ามมี letter-spacing · ตัวเลขบนจอต้องบอกได้ว่ามาจากไหน
- ไม่ออกแบบวิธีเช็คอินใหม่ (Por ว่างไว้) · ไม่แตะใบรับรองฝึกงาน

**Seed ที่เทสต์อ้างอิง (dev และ test):** alice ลง "ShowPro Hackathon" (completed, `rewardGranted=true`) · bob ลง "ShowPro Hackathon" (registered) และ "Career Portfolio Workshop" (registered, upcoming, `checkInEnabled=true`) · ทุกคน `showInLeaderboard=true` · รหัส `Password123!`

## Review Focus

1. นักศึกษาที่ตั้ง `showInLeaderboard=false` ต้องยังเห็นตัวเองใน leaderboard ได้ แต่คนอื่นไม่เห็นชื่อ (Task 1, Task 2)
2. การลงทะเบียนที่ยังไม่ได้รับรางวัล (`rewardGranted=false`) ต้องไม่นับแต้มเลย ไม่ใช่ครึ่งหนึ่ง (Task 2)
3. นักศึกษาที่ยังไม่มี badge → แสดง "ยังไม่มี badge" ไม่ใช่ไอคอน 3 อันที่ฝังไว้ (Task 3)
4. ลงทะเบียนกิจกรรมแล้วกดรีเฟรชหน้า → ยังขึ้น "ลงทะเบียนแล้ว" (Task 3 E2E)
5. ไม่มีคำขอ `/api/player/stats` อีก และ role-pages E2E ไม่ต้องยกเว้น 404 นี้แล้ว (Task 3)

---

### Task 1: backend — ปิดเช็คอินด้วยตัวเอง, ความยินยอม leaderboard, เทอมใน timeline

**Files:**
- Modify: `backend/src/controllers/activities.controller.ts` (`checkInActivity`, `getActivities` include consent), `backend/src/services/access-policy.ts` (`scopeActivityForViewer`), `backend/src/services/activity.service.ts` (`grantActivityReward` timeline `semester`/`academicYear`)
- Test: `backend/tests/student-activities.test.ts`

**Interfaces — Produces:** `scopeActivityForViewer(activity, viewer)` สำหรับ STUDENT: enrollment ของคนอื่นที่ `student.consent.showInLeaderboard === false` → `student: { id, user: null }` (ยังคงแถวไว้เพื่อนับจำนวนผู้เข้าร่วม) · ของผู้ดูเองคงชื่อไว้ · ไม่มี `consent` หลุดออกไปในผลลัพธ์

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;

describe("student self check-in is closed until a check-in method is chosen", () => {
  it("returns 403 and grants nothing", async () => {
    const workshop = await prisma.activity.findFirstOrThrow({ where: { title: "Career Portfolio Workshop" } });
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const res = await request(app).post(`/api/activities/check-in/${workshop.id}`).set("Authorization", await as("bob@student.showpro.local"));
    expect(res.status).toBe(403);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { id: bob.id } })).gamificationPoints).toBe(bob.gamificationPoints);
  });
});

describe("leaderboard consent", () => {
  it("hides a student who opted out from other students, but not from themselves", async () => {
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    await prisma.dataConsent.update({ where: { studentId: bob.id }, data: { showInLeaderboard: false } });
    try {
      const seenByAlice = await request(app).get("/api/activities").set("Authorization", await as("alice@student.showpro.local"));
      const text = JSON.stringify(seenByAlice.body);
      expect(text).not.toMatch(/Bob|บ๊อบ/);
      expect(text).not.toMatch(/showInLeaderboard|"consent"/);
      const bobRows = seenByAlice.body.activities.flatMap((a: { enrollments: Array<{ studentId: string; student: { user: unknown } }> }) => a.enrollments).filter((e: { studentId: string }) => e.studentId === bob.id);
      expect(bobRows.length).toBeGreaterThan(0);
      for (const row of bobRows) expect(row.student.user).toBeNull();

      const seenByBob = await request(app).get("/api/activities").set("Authorization", await as("bob@student.showpro.local"));
      expect(JSON.stringify(seenByBob.body)).toMatch(/Bob|บ๊อบ/);
    } finally {
      await prisma.dataConsent.update({ where: { studentId: bob.id }, data: { showInLeaderboard: true } });
    }
  });
});

describe("activity reward timeline", () => {
  it("records the student's own term and academic year, not a hard-coded term 1 / Gregorian year", async () => {
    const staff = await as("staff@showpro.local");
    const created = await request(app).post("/api/activities").set("Authorization", staff).send({
      title: "Timeline check", titleThai: "ทดสอบไทม์ไลน์", description: "d", type: "workshop",
      startDate: "2026-12-01T09:00:00.000Z", endDate: "2026-12-01T12:00:00.000Z",
      location: "CAMT", organizer: "DII", activityHours: 1, gamificationPoints: 1, status: "upcoming",
    });
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const enrollment = await prisma.activityEnrollment.create({ data: { activityId: created.body.activity.id, studentId: bob.id } });
    expect((await request(app).patch(`/api/activities/enrollments/${enrollment.id}/status`).set("Authorization", staff).send({ status: "completed" })).status).toBe(200);
    const event = await prisma.timelineEvent.findFirstOrThrow({ where: { relatedId: created.body.activity.id, studentId: bob.id } });
    expect(event.semester).toBe(bob.semester);
    expect(event.academicYear).toBe(bob.academicYear);
  });
});
```
> ก่อนรัน: ตรวจชื่อ model consent ใน Prisma (`dataConsent`) และ field `semester`/`academicYear` ของ `TimelineEvent` (ชนิดตรงกับของ StudentProfile หรือไม่ — ถ้า TimelineEvent.semester เป็น Int และ StudentProfile.semester เป็น Int ก็เทียบตรงได้) · ตรวจชื่อ bob ใน seed (Bob/บ๊อบ) แล้วแก้ regex ให้ตรง

- [ ] **Step 2: รัน → FAIL** — `cd backend && npx vitest run tests/student-activities.test.ts` · Expected: check-in ได้ 200, ชื่อ bob ยังเห็นได้, timeline เป็น semester 1 / "2026"

- [ ] **Step 3: แก้โค้ด**
- `checkInActivity`: แทนทั้ง body ด้วย `throw new AppError(403, "Activity self check-in is disabled until a check-in method is chosen");` (คอมเมนต์: Por 6/10/69 — ว่างไว้จนกว่าจะเลือกวิธีเช็คอิน) · ลบ import ที่ไม่ใช้แล้ว
- `getActivities` include: `student: { include: { user: true, consent: { select: { showInLeaderboard: true } } } }`
- `scopeActivityForViewer` สาย STUDENT: ต้องรู้ `studentProfileId` ของผู้ดู — เปลี่ยน signature เป็น `scopeActivityForViewer(activity, viewer: { id: string; role: Role; studentProfileId?: string | null })` และใน controller ส่ง `await viewerContext(req)` (มีอยู่แล้วใน access-policy) แทน `requireUser(req)` · ในการ map: `const hidden = e.student?.consent?.showInLeaderboard === false && e.studentId !== viewer.studentProfileId;` → `student: { id: e.student.id, user: hidden ? null : publicUser(e.student.user, false) }` · สาย STAFF/LECTURER/ADMIN คืนเดิมแต่ต้องตัด `consent` ออกจาก student ก่อนส่ง (หรือคงไว้ได้เพราะเป็น staff — ตัดสินแล้วบันทึกใน ledger)
- `grantActivityReward`: `semester: activityEnrollment.student.semester, academicYear: activityEnrollment.student.academicYear` (มี `include: { student: true }` อยู่แล้ว)

- [ ] **Step 4: รัน → PASS** · ทั้งชุด `npm test --prefix backend` · `npx tsc --noEmit` exit 0 · ตรวจว่า `tests/activities-exposure.test.ts` ของ S-b1 ยังผ่าน (signature เปลี่ยน)

---

### Task 2: leaderboard แบบ pure function

**Files:**
- Create: `src/lib/activity-leaderboard.ts`, `src/lib/activity-leaderboard.test.ts`

**Interfaces — Produces:** `buildLeaderboard(rawActivities: unknown[], viewerStudentId: string): Array<{ rank: number; studentId: string; name: string; points: number; isViewer: boolean }>` — นับแต้มเฉพาะ enrollment ที่ `rewardGranted === true` (แต้ม = `activity.gamificationPoints`) · ข้ามแถวที่ `student.user` เป็น null (ไม่ยินยอม) ยกเว้นเป็นของผู้ดูเอง · ข้ามคนที่ได้ 0 แต้ม · เรียงมาก→น้อย เอา 5 อันดับ

- [ ] **Step 1: unit test ที่ fail**

```ts
import { describe, expect, it } from 'vitest';
import { buildLeaderboard } from './activity-leaderboard';

const enrol = (studentId: string, name: string | null, rewardGranted: boolean) => ({
  studentId, rewardGranted, status: rewardGranted ? 'completed' : 'registered',
  student: { id: studentId, user: name === null ? null : { name, nameThai: name } },
});

describe('buildLeaderboard', () => {
  const activities = [
    { gamificationPoints: 50, enrollments: [enrol('a', 'Alice', true), enrol('b', 'Bob', false)] },
    { gamificationPoints: 20, enrollments: [enrol('a', 'Alice', true), enrol('c', null, true)] },
  ];

  it('counts only rewarded enrollments, never half points for merely registering', () => {
    const rows = buildLeaderboard(activities, 'x');
    expect(rows).toEqual([{ rank: 1, studentId: 'a', name: 'Alice', points: 70, isViewer: false }]);
  });

  it('keeps an opted-out student off other people\'s boards but shows them to themselves', () => {
    expect(buildLeaderboard(activities, 'x').some((r) => r.studentId === 'c')).toBe(false);
    const own = buildLeaderboard(activities, 'c').find((r) => r.studentId === 'c');
    expect(own).toMatchObject({ points: 20, isViewer: true });
  });

  it('is empty when nobody has been rewarded', () => {
    expect(buildLeaderboard([{ gamificationPoints: 10, enrollments: [enrol('b', 'Bob', false)] }], 'b')).toEqual([]);
  });
});
```

- [ ] **Step 2: รัน → FAIL** — `npx vitest run src/lib/activity-leaderboard.test.ts`

- [ ] **Step 3: เขียน `src/lib/activity-leaderboard.ts`**

```ts
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';

export type LeaderboardEntry = { rank: number; studentId: string; name: string; points: number; isViewer: boolean };

/** Points a student actually received (rewarded enrollments only); opted-out students are shown only to themselves. */
export const buildLeaderboard = (rawActivities: unknown[], viewerStudentId: string): LeaderboardEntry[] => {
  const totals = new Map<string, { name: string; points: number }>();
  for (const item of rawActivities) {
    const activity = asRecord(item);
    const points = asNumber(activity.gamificationPoints, 0);
    for (const enrollmentItem of asArray(activity.enrollments)) {
      const enrollment = asRecord(enrollmentItem);
      if (enrollment.rewardGranted !== true) continue;
      const student = asRecord(enrollment.student);
      const studentId = asString(enrollment.studentId, asString(student.id));
      if (!studentId) continue;
      const isViewer = studentId === viewerStudentId;
      if (student.user === null && !isViewer) continue;
      const user = asRecord(student.user);
      const name = asString(user.nameThai, asString(user.name, isViewer ? 'คุณ' : '-'));
      const current = totals.get(studentId) ?? { name, points: 0 };
      totals.set(studentId, { name: current.name, points: current.points + points });
    }
  }
  return Array.from(totals.entries())
    .filter(([, value]) => value.points > 0)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 5)
    .map(([studentId, value], index) => ({
      rank: index + 1,
      studentId,
      name: value.name,
      points: value.points,
      isViewer: studentId === viewerStudentId,
    }));
};
```

- [ ] **Step 4: รัน → PASS**

---

### Task 3: หน้า Activities ของนักศึกษา

**Files:**
- Modify: `src/pages/Activities.tsx` (ลบ `buildLeaderboard` เดิม บรรทัด ~67-106 · effect โหลดข้อมูล ~222-262 · การ์ด "แนะนำ" `index === 0` ~450 · grid badge ~603-615 · บล็อก next badge ~617-627 · ปุ่ม Check in ~659-675), `src/lib/api.ts` (ลบ `player.stats` ถ้าไม่มีที่ใช้แล้ว), `e2e/role-pages.spec.ts` (ลบ `/^404 GET \/api\/player\/stats/` ออกจาก `BASELINE`)
- Test: `e2e/student-activities.spec.ts`

**Interfaces — Consumes:** `buildLeaderboard` (Task 2) · `api.students.profile()` และ `api.students.stats()` (มีอยู่แล้ว) · `mapStudent`, `mapStudentStatsToStudent` (live-mappers)

- [ ] **Step 1: E2E ที่ fail**

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

test("a student sees what they joined, their real points, and no check-in button", async ({ page, request }) => {
  const calls: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/api/")) calls.push(r.url()); });
  await login(page, "bob@student.showpro.local");
  const token = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const stats = await (await request.get("http://localhost:4000/api/students/stats", { headers: { Authorization: `Bearer ${token}` } })).json();

  await page.goto("/activities");
  await page.waitForLoadState("networkidle");
  const main = page.locator("main");
  await expect(main.getByText("ลงทะเบียนแล้ว").first()).toBeVisible();
  await expect(main.getByText(String(stats.stats.gamificationPoints)).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /check in|เช็คอิน/i })).toHaveCount(0);
  await expect(main.getByText("Activity Master")).toHaveCount(0);
  expect(calls.some((u) => u.includes("/player/stats"))).toBe(false);
});

test("a student without badges is told so instead of seeing placeholder icons", async ({ page }) => {
  await login(page, "bob@student.showpro.local");
  await page.goto("/activities");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").getByText(/🚀|🎯|💎/)).toHaveCount(0);
});
```
> ก่อนรัน: ตรวจ key ของ token ใน localStorage (`src/lib/api.ts` ~84-92) แล้วแก้ `showpro_auth_token` ให้ตรง · ตรวจว่า bob มี badge ใน seed หรือไม่ ถ้ามีให้ assert ว่าเห็นชื่อ badge จริงแทน · ข้อความ "ลงทะเบียนแล้ว" มาจากปุ่มของกิจกรรมที่ลงไว้ (Activities.tsx ~477)

- [ ] **Step 2: รัน → FAIL** (ไม่ขึ้น "ลงทะเบียนแล้ว", แต้มเป็น 0, มีคำขอ /player/stats, มี Activity Master)

- [ ] **Step 3: แก้ `Activities.tsx`**
- ลบ `buildLeaderboard` เดิมในไฟล์ · import จาก `@/lib/activity-leaderboard` · state `leaderboard` เป็น `LeaderboardEntry[]` · จุดแสดงผล leaderboard ใช้ `entry.name`, `entry.points`, ป้าย "Top" เฉพาะ `rank === 1`, เน้นแถว `isViewer` · ใต้หัว leaderboard เขียนว่า "แต้มจากกิจกรรมที่ได้รับรางวัลแล้ว"
- effect โหลด: `Promise.allSettled([api.activities.list(), api.students.profile(), api.students.stats()])` → `student = mapStudentStatsToStudent(mapStudent(profile), stats)` · `setLeaderboard(buildLeaderboard(raw, student.id))` · `refreshActivities` ใช้ `student.id` เดียวกัน
- การ์ด "แนะนำ" ที่ `index === 0`: ลบป้าย (ไม่มีข้อมูลจริง)
- grid badge: แสดง `student.badges` จริง (ชื่อ + icon ถ้ามี) · ถ้าไม่มีแสดง "ยังไม่มี badge" · ลบ emoji ที่ฝังไว้
- บล็อก next badge (Activity Master 60%): ลบทั้งบล็อก
- ปุ่ม "Check in": ลบ (คอมเมนต์: ซ่อนตามที่ Por ตัดสิน 6/10/69 จนกว่าจะเลือกวิธีเช็คอิน)
- `api.ts`: ลบ `player.stats` ถ้า grep ไม่เจอที่ใช้อื่น · `role-pages.spec.ts`: ลบ baseline 404 `/player/stats`

- [ ] **Step 4: รันทั้งหมด** — E2E ไฟล์นี้ PASS · `npx playwright test` ทั้งหมด PASS (role-pages ไม่มี baseline แล้ว) · unit `src/lib/*.test.ts` (ยกเว้น `import-mapping.test.ts` ของทีมที่ใช้ node:assert) PASS · build ผ่าน · tsc ไม่มี error ใหม่ (baseline 3) · ⚠️ รีสตาร์ต backend dev ก่อนรัน E2E
