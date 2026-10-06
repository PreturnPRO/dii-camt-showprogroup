# Audit F-a: บริษัทโพสต์งานได้จริง (F7), เลิกแสดงข้อมูลตัวอย่าง (F9), กิจกรรมมีเจ้าของ (F1 ส่วนที่เหลือ) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** บริษัทโพสต์ฝึกงานได้ เห็นตัวเลขจับคู่ที่มาจากทักษะจริงแยกตาม requirement · นักศึกษาสมัครงานที่ปิดหรือเลยกำหนดไม่ได้ และใบสมัครไม่หายเพราะบริษัทลบงาน · หน้าเป้าหมายอาชีพแสดงเฉพาะสิ่งที่บริษัทกำหนดจริง · หน้า InternTracking และ Cooperation ไม่เอาข้อมูลตัวอย่างมาแสดงเป็นของจริง · อาจารย์แก้ ลบ หรืออนุมัติกิจกรรมของคนอื่นไม่ได้

**Architecture:** backend: เพิ่ม `Activity.createdById` (migration เขียน SQL เอง) และเช็คเจ้าของใน activities controller · เพิ่มเงื่อนไขใน `createApplicationHandler` / `deleteJobHandler` · `getCareerTargetsHandler` คืนเฉพาะข้อมูลจริง · frontend: ตัดโควตาใน JobPostings · ตัวคำนวณจับคู่แบบ pure function `src/lib/skill-match.ts` ใช้ใน SkillsRequirement · ตัด fallback ตัวอย่างใน InternTracking/Cooperation · การ์ดเป้าหมายอาชีพใน StudentDashboard แสดงเฉพาะเกณฑ์จริง

**Tech Stack:** Express 4, Prisma 6 (migration SQL), Zod, Vitest + supertest, React 18 + Vite, Vitest, Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` กลุ่ม F7, F9, F1 · รายละเอียด `6-frontend-admin-company-shell.md` (quota, match %, view matches, delete), `5-frontend-lecturer-staff.md` (activities ownership, InternTracking, Cooperation), `3-backend-career-ops.md` (career targets, apply to closed job) · **การตัดสินของ Por 6/10/69:** เอาโควตาฝึกงานออก · % จับคู่คำนวณจากทักษะจริง แยกตาม requirement · กิจกรรมเก็บผู้สร้าง อาจารย์แก้/ลบได้เฉพาะของตัวเองแต่อนุมัติไม่ได้ staff/admin จัดการได้ทุกอัน กิจกรรมเก่าที่ไม่รู้ผู้สร้างให้ staff จัดการ · งานที่มีคนสมัครแล้วลบไม่ได้ ให้ปิดแทน · ของที่ระบบไม่มีข้อมูลจริง = ซ่อน (กติกาเดิม)

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `26c2211`) · ห้าม commit/push ระหว่างรัน — Por อนุมัติตอนจบ
- เทสต์ใช้ DB `showpro_main_test` เท่านั้น · dev ใช้ `showpro_main` · ห้ามแตะ `showpro` / `showpro_test`
- migration ได้ 1 ตัว (Task 1) · เขียน `migration.sql` เอง (ห้าม `prisma migrate dev` แบบ interactive · ห้าม `prisma format`) · apply กับ dev ด้วย `npx prisma migrate deploy` (ใน `backend/`, `.env` ชี้ `showpro_main`) · หลัง `prisma generate` ต้องรีสตาร์ต backend dev (tsx watch ไม่โหลด client ใหม่)
- ข้อความ error ภาษาอังกฤษตามแบบเดิม · ข้อความไทยห้ามมี letter-spacing · ตัวเลขทุกตัวบนจอต้องบอกได้ว่ามาจากไหน
- ไม่อยู่ในแผนนี้: F6 หน้ากิจกรรมนักศึกษา (Por: แก้แต่ซ่อนปุ่มเช็คอิน — แผนถัดไป), เช็คอินกิจกรรม, ใบรับรองฝึกงาน

**Seed ที่เทสต์อ้างอิง:** company `talent@northernsoft.local` · company อื่น `careers@creativelabs.local` · lecturer `narin@showpro.local`, `mali@showpro.local` · staff `staff@showpro.local` · student `alice@student.showpro.local`, `bob@student.showpro.local` · รหัส `Password123!` · helper `loginAs(email)` (`backend/tests/helpers/auth.ts`)

## Review Focus

1. นักศึกษากดสมัครงานเดิมซ้ำ → ต้องได้ 409 พร้อมข้อความ ไม่ใช่ 500 (Task 2)
2. กิจกรรมเก่าที่ `createdById` เป็น null → อาจารย์ทุกคนแก้/ลบไม่ได้ staff ทำได้ (Task 1)
3. requirement ที่ไม่มีทักษะเลย หรือไม่มีนักศึกษาตรงสักคน → ตัวเลขเป็น 0 / "ยังไม่มีคนที่ตรง" ไม่ใช่ NaN หรือ 100% (Task 3)
4. งานที่ประกาศไม่ระบุ GPA → หน้าเป้าหมายอาชีพไม่แสดงแถว GPA และไม่นับว่า "ยังไม่ผ่าน" (Task 4)
5. นักศึกษาฝึกงานที่ยังไม่มีบันทึกหรือผลประเมิน → InternTracking แสดง "ยังไม่มีข้อมูล" ไม่ใช่คะแนนของคนอื่น (Task 5)

---

### Task 1: กิจกรรมมีเจ้าของ

**Files:**
- Create: `backend/prisma/migrations/20261006120000_activity_created_by/migration.sql`
- Modify: `backend/prisma/schema.prisma` (`model Activity` เพิ่ม 2 บรรทัด, `model User` เพิ่ม relation 1 บรรทัด), `backend/src/controllers/activities.controller.ts` (`createActivity`, `updateActivity`, `deleteActivity`, `updateEnrollmentStatus`)
- Test: `backend/tests/activity-ownership.test.ts`

**Interfaces — Produces:** `Activity.createdById: String?` (FK → `User.id`, `onDelete: SetNull`) · `assertActivityManager(user, activityId): Promise<Activity>` ใน `activities.controller.ts` — STAFF/ADMIN ผ่าน · LECTURER ต้อง `createdById === user.id` · ไม่พบ → 404 · อื่น → 403 `"You can only manage activities you created"`

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/activity-ownership.test.ts`

```ts
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const body = (title: string) => ({
  title, titleThai: title, description: "d", type: "workshop",
  startDate: "2026-12-01T09:00:00.000Z", endDate: "2026-12-01T12:00:00.000Z",
  location: "CAMT", organizer: "DII", activityHours: 3, gamificationPoints: 10, status: "upcoming",
});

let narinActivity: string;
let legacyActivity: string;

beforeAll(async () => {
  const res = await request(app).post("/api/activities").set("Authorization", await as("narin@showpro.local")).send(body("Narin workshop"));
  narinActivity = res.body.activity.id;
  legacyActivity = (await prisma.activity.findFirstOrThrow({ where: { createdById: null } })).id;
});

describe("activity ownership", () => {
  it("a lecturer's new activity records the creator and waits for approval", async () => {
    const a = await prisma.activity.findUniqueOrThrow({ where: { id: narinActivity } });
    const narin = await prisma.user.findUniqueOrThrow({ where: { email: "narin@showpro.local" } });
    expect(a.createdById).toBe(narin.id);
    expect(a.status).toBe("pending");
  });

  it("another lecturer cannot edit or delete it", async () => {
    const auth = await as("mali@showpro.local");
    expect((await request(app).patch(`/api/activities/${narinActivity}`).set("Authorization", auth).send({ title: "x" })).status).toBe(403);
    expect((await request(app).delete(`/api/activities/${narinActivity}`).set("Authorization", auth)).status).toBe(403);
  });

  it("the creator can edit it but cannot approve it", async () => {
    const auth = await as("narin@showpro.local");
    const res = await request(app).patch(`/api/activities/${narinActivity}`).set("Authorization", auth).send({ title: "Renamed", status: "upcoming" });
    expect(res.status).toBe(200);
    const a = await prisma.activity.findUniqueOrThrow({ where: { id: narinActivity } });
    expect(a.title).toBe("Renamed");
    expect(a.status).toBe("pending");
  });

  it("no lecturer can touch an activity whose creator is unknown; staff can", async () => {
    expect((await request(app).patch(`/api/activities/${legacyActivity}`).set("Authorization", await as("narin@showpro.local")).send({ title: "x" })).status).toBe(403);
    expect((await request(app).patch(`/api/activities/${legacyActivity}`).set("Authorization", await as("staff@showpro.local")).send({ status: "upcoming" })).status).toBe(200);
  });

  it("a lecturer cannot mark enrollments on someone else's activity", async () => {
    const enrollment = await prisma.activityEnrollment.findFirstOrThrow({ where: { activityId: legacyActivity } });
    const res = await request(app).patch(`/api/activities/enrollments/${enrollment.id}/status`).set("Authorization", await as("mali@showpro.local")).send({ status: "registered" });
    expect(res.status).toBe(403);
  });

  it("staff can approve and delete the lecturer's activity", async () => {
    const auth = await as("staff@showpro.local");
    expect((await request(app).patch(`/api/activities/${narinActivity}`).set("Authorization", auth).send({ status: "upcoming" })).status).toBe(200);
    expect((await prisma.activity.findUniqueOrThrow({ where: { id: narinActivity } })).status).toBe("upcoming");
    expect((await request(app).delete(`/api/activities/${narinActivity}`).set("Authorization", auth)).status).toBe(200);
  });
});
```
> ก่อนรัน: ตรวจ field บังคับของ `activityCreateSchema` แล้วเติม `body()` ให้ผ่าน validation · seed ต้องมีกิจกรรมที่มี enrollment อย่างน้อย 1 อัน (S-b1 ยืนยันแล้วว่ามี) — ถ้า `findFirstOrThrow({ where: { activityId: legacyActivity } })` ไม่เจอ ให้เลือก `legacyActivity` เป็นกิจกรรมที่มี enrollment

- [ ] **Step 2: รัน → FAIL** — `cd backend && npx vitest run tests/activity-ownership.test.ts` · Expected: TypeScript/Prisma error ที่ `createdById` (ยังไม่มี field) — เป็น RED ที่ถูก

- [ ] **Step 3: schema + migration**

`schema.prisma` ใน `model Activity` (ต่อจาก `evaluations Json?`):
```prisma
  createdById            String?
  createdBy              User?                @relation("ActivityCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
```
ใน `model User` เพิ่ม:
```prisma
  activitiesCreated Activity[] @relation("ActivityCreatedBy")
```
`backend/prisma/migrations/20261006120000_activity_created_by/migration.sql`:
```sql
-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```
รัน `cd backend && npx prisma generate && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW"` ถ้ามี shadow DB · ถ้าไม่มี ให้ตรวจด้วยการรันเทสต์ (global setup ทำ `migrate reset` จาก migrations) · แล้ว apply กับ dev: `npx prisma migrate deploy` → Expected: `1 migration applied`

- [ ] **Step 4: แก้ controller** `activities.controller.ts`

```ts
const assertActivityManager = async (user: { id: string; role: Role }, activityId: string) => {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) throw new AppError(404, "Activity not found");
  if (user.role === Role.STAFF || user.role === Role.ADMIN) return activity;
  if (user.role === Role.LECTURER && activity.createdById === user.id) return activity;
  throw new AppError(403, "You can only manage activities you created");
};
```
- `createActivity`: `const currentUser = requireUser(req);` · `data: { ...req.body, createdById: currentUser.id, ...(currentUser.role === Role.LECTURER ? { status: "pending" } : {}) }`
- `updateActivity`: `const currentUser = requireUser(req); await assertActivityManager(currentUser, activityId);` (แทน findUnique เดิม) · ถ้า LECTURER → `delete req.body.status` (อนุมัติไม่ได้) · ห้ามให้ body เปลี่ยน `createdById` (`delete req.body.createdById`)
- `deleteActivity`: `await assertActivityManager(requireUser(req), activityId)` ก่อน deleteMany
- `updateEnrollmentStatus`: หา enrollment (`select: { activityId: true }`, 404 ถ้าไม่พบ) → `await assertActivityManager(requireUser(req), enrollment.activityId)` ก่อนทำต่อ

- [ ] **Step 5: รัน → PASS** · ทั้งชุด `npm test --prefix backend` · `cd backend && npx tsc --noEmit` exit 0

---

### Task 2: สมัครงาน / ลบงาน / โควตา

**Files:**
- Modify: `backend/src/controllers/career.controller.ts` (`createApplicationHandler`, `deleteJobHandler`), `src/pages/JobPostings.tsx` (ตัดโควตา: บรรทัด 74-76, 90, 548-554, 630-638)
- Test: `backend/tests/job-application-rules.test.ts`, `e2e/company-jobs.spec.ts`

- [ ] **Step 1: เทสต์ backend ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;

const newJob = async (overrides: Record<string, unknown> = {}) => {
  const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
  return prisma.jobPosting.create({
    data: {
      companyId: company.id, title: `Job ${Date.now()}-${Math.random()}`, type: "internship", description: "d",
      location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 7 * 86400000), status: "open", ...overrides,
    },
  });
};
const apply = async (jobId: string, email = "alice@student.showpro.local") =>
  request(app).post(`/api/apply/${jobId}`).set("Authorization", await as(email)).send({});

describe("applying for a job", () => {
  it("works for an open job before its deadline", async () => {
    expect((await apply((await newJob()).id)).status).toBe(201);
  });
  it("refuses closed, draft, inactive and past-deadline jobs", async () => {
    for (const o of [{ status: "closed" }, { status: "draft" }, { isActive: false }, { deadline: new Date(Date.now() - 86400000) }]) {
      expect((await apply((await newJob(o)).id)).status).toBe(409);
    }
  });
  it("refuses when the applicant limit is reached", async () => {
    const job = await newJob({ maxApplicants: 1 });
    expect((await apply(job.id, "alice@student.showpro.local")).status).toBe(201);
    expect((await apply(job.id, "bob@student.showpro.local")).status).toBe(409);
  });
  it("applying twice gives 409, not 500", async () => {
    const job = await newJob();
    await apply(job.id);
    expect((await apply(job.id)).status).toBe(409);
  });
  it("an unknown job gives 404", async () => {
    expect((await apply("no-such-job")).status).toBe(404);
  });
});

describe("deleting a job", () => {
  it("is refused once someone applied; the application survives", async () => {
    const job = await newJob();
    await apply(job.id);
    const res = await request(app).delete(`/api/jobs/${job.id}`).set("Authorization", await as("talent@northernsoft.local"));
    expect(res.status).toBe(409);
    expect(await prisma.application.count({ where: { jobPostingId: job.id } })).toBe(1);
  });
  it("still works when nobody applied", async () => {
    const job = await newJob();
    expect((await request(app).delete(`/api/jobs/${job.id}`).set("Authorization", await as("talent@northernsoft.local"))).status).toBe(200);
  });
});
```

- [ ] **Step 2: รัน → FAIL** — `npx vitest run tests/job-application-rules.test.ts` · Expected: งานปิด/เลยกำหนดได้ 201, สมัครซ้ำได้ 500, ลบงานได้ 200 และใบสมัครหาย

- [ ] **Step 3: แก้ backend**
- `createApplicationHandler` ก่อน `prisma.application.create`:
```ts
const job = await prisma.jobPosting.findUnique({
  where: { id: jobPostingId },
  include: { _count: { select: { applications: true } } },
});
if (!job) throw new AppError(404, "Job posting not found");
if (job.status !== "open" || !job.isActive || job.deadline.getTime() < Date.now()) {
  throw new AppError(409, "This job is not accepting applications");
}
if (job.maxApplicants !== null && job._count.applications >= job.maxApplicants) {
  throw new AppError(409, "This job has reached its applicant limit");
}
const already = await prisma.application.findUnique({
  where: { jobPostingId_studentId: { jobPostingId, studentId: student.id } },
});
if (already) throw new AppError(409, "You have already applied for this job");
```
- `deleteJobHandler`: แทน `prisma.application.deleteMany(...)` ด้วย
```ts
const applications = await prisma.application.count({ where: { jobPostingId: jobId } });
if (applications > 0) {
  throw new AppError(409, "This job already has applications; close it instead of deleting");
}
```

- [ ] **Step 4: รัน backend → PASS** · ทั้งชุด · tsc

- [ ] **Step 5: E2E ที่ fail** — `e2e/company-jobs.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test("a new company can post an internship (no quota block)", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "talent@northernsoft.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/job-postings");
  await page.getByRole("button", { name: /สร้างประกาศ|ประกาศงานใหม่|new job|create/i }).first().click();
  await expect(page.getByText(/โควตา|quota/i)).toHaveCount(0);
  const publish = page.getByRole("button", { name: /เผยแพร่|publish/i }).last();
  await expect(publish).toBeEnabled();
});
```
> ก่อนรัน: เปิด `/job-postings` ในฐานะบริษัทแล้วดูชื่อปุ่มสร้างประกาศ/เผยแพร่จริง และวิธีเลือกประเภท "ฝึกงาน" ในฟอร์ม (ถ้าค่าเริ่มต้นไม่ใช่ internship ให้เลือกก่อนเช็คปุ่ม) แก้ selector ให้ตรง · เทสต์นี้ต้อง FAIL ก่อนแก้ (ปุ่มถูกปิดเพราะโควตา 0) — ถ้าผ่านก่อนแก้แปลว่ายังไม่ได้อยู่ในฟอร์มฝึกงาน

- [ ] **Step 6: รัน E2E → FAIL** (ต้องมี backend :4000 + vite :8080 จาก worktree)

- [ ] **Step 7: แก้ `JobPostings.tsx`** — ลบ `internshipSlots`, `currentInterns`, `availableSlots`, `isExceedingQuota` และทุกจุดที่ใช้ (`max=...`, `className` แดง, ข้อความ `copy.quotaLabel`, `disabled={isExceedingQuota}` ทั้ง 3 ปุ่ม) · ลบ `quotaLabel` ออกจาก `copy` ถ้าไม่มีที่ใช้แล้ว · การลบงานที่ได้ 409 จะแสดง toast ข้อความจาก backend อยู่แล้ว (`handleDelete` บรรทัด 346-355)

- [ ] **Step 8: รัน E2E → PASS** · `npx tsc --noEmit -p tsconfig.app.json` ไม่มี error ใหม่ (baseline 3)

---

### Task 3: % จับคู่จากทักษะจริง แยกตาม requirement

**Files:**
- Create: `src/lib/skill-match.ts`, `src/lib/skill-match.test.ts`
- Modify: `src/pages/SkillsRequirement.tsx` (`mapJobRequirement` บรรทัด ~95-106, effect โหลดข้อมูล ~108-140, ปุ่ม "ดูคนที่ตรงกัน" ~335, `handleSave` ส่วนอัปเดต `internshipSlots` ~210-220, `handleDelete` ~233-239)

**Interfaces — Produces:**
- `type TalentMatch = { matchedSkills: string[]; missingSkills: string[] }`
- `summarizeMatches(talents: TalentMatch[], requiredCount: number): { matchedStudents: number; avgMatch: number }` — นับเฉพาะนักศึกษาที่ตรงอย่างน้อย 1 ทักษะ · `avgMatch` = ค่าเฉลี่ยของ `matchedSkills.length / requiredCount × 100` ปัดเป็นจำนวนเต็ม ในกลุ่มที่นับ · `requiredCount === 0` หรือไม่มีใครตรง → `{ matchedStudents: 0, avgMatch: 0 }`

- [ ] **Step 1: unit test ที่ fail** — `src/lib/skill-match.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { summarizeMatches } from './skill-match';

const t = (matched: number, missing: number) => ({
  matchedSkills: Array.from({ length: matched }, (_, i) => `m${i}`),
  missingSkills: Array.from({ length: missing }, (_, i) => `x${i}`),
});

describe('summarizeMatches', () => {
  it('averages the share of required skills among students who match at least one', () => {
    expect(summarizeMatches([t(2, 2), t(4, 0), t(0, 4)], 4)).toEqual({ matchedStudents: 2, avgMatch: 75 });
  });
  it('is 0 when nobody matches', () => {
    expect(summarizeMatches([t(0, 3)], 3)).toEqual({ matchedStudents: 0, avgMatch: 0 });
  });
  it('is 0 when the requirement lists no skills', () => {
    expect(summarizeMatches([t(0, 0)], 0)).toEqual({ matchedStudents: 0, avgMatch: 0 });
  });
});
```

- [ ] **Step 2: รัน → FAIL** — `npx vitest run src/lib/skill-match.test.ts` · Expected: Cannot find module

- [ ] **Step 3: เขียน `src/lib/skill-match.ts`**

```ts
export type TalentMatch = { matchedSkills: string[]; missingSkills: string[] };

/** Match numbers come from talent search (skills students actually listed), never from applicant counts. */
export const summarizeMatches = (talents: TalentMatch[], requiredCount: number) => {
  if (requiredCount <= 0) return { matchedStudents: 0, avgMatch: 0 };
  const matching = talents.filter((item) => item.matchedSkills.length > 0);
  if (matching.length === 0) return { matchedStudents: 0, avgMatch: 0 };
  const total = matching.reduce((sum, item) => sum + item.matchedSkills.length / requiredCount, 0);
  return { matchedStudents: matching.length, avgMatch: Math.round((total / matching.length) * 100) };
};
```

- [ ] **Step 4: รัน unit → PASS**

- [ ] **Step 5: แก้ `SkillsRequirement.tsx`**
- `mapJobRequirement`: ลบ `matchedStudents: applications.length` และ `avgMatch: ...70 + applications.length * 5...` · ตั้งเริ่มต้น `matchedStudents: 0, avgMatch: 0, matches: []`
- หลังโหลด requirements: สำหรับแต่ละ requirement เรียก `api.talent.search(\`?jobId=${encodeURIComponent(req.id)}\`)` (Promise.allSettled) → map `talents` เป็น `TalentMatch` (`asArray<string>(t.matchedSkills)`, `asArray<string>(t.missingSkills)`) → `summarizeMatches(list, req.skills.length)` → เก็บ `matchedStudents`, `avgMatch` และ `matches` (รายชื่อเฉพาะคนที่ `matchedSkills.length > 0`) ลงใน requirement นั้น
- ปุ่ม "ดูคนที่ตรงกัน" แสดง `requirement.matches` ของ requirement นั้น (ไม่ใช่ talent list รวม) · ถ้าว่างแสดง "ยังไม่มีนักศึกษาที่มีทักษะตรง"
- ตัวเลข % มีคำอธิบายใต้ตัวเลข: "เฉลี่ยสัดส่วนทักษะที่ตรง จากนักศึกษา N คนที่มีอย่างน้อย 1 ทักษะ" (กติกา UI number units)
- `priority` ที่เดาจาก `job.status`: ตัดออกจากการแสดงผล (ไม่มีข้อมูลจริง) หรือแสดงค่าที่ฟอร์มส่งจริง ถ้า backend เก็บไว้ — ตรวจก่อนแก้
- `handleSave`: ลบส่วนที่อัปเดต `internshipSlots` ผ่าน `updateProfile`
- `handleDelete`: ถ้า `api.jobs.remove` ล้ม → toast error แล้ว**ไม่**ลบออกจาก state

- [ ] **Step 6: ตรวจ** — `npx vitest run src` PASS · tsc ไม่มี error ใหม่ · เปิดหน้า `/skills-requirement` ในฐานะ `talent@northernsoft.local` (dev server) ดูว่าตัวเลขเปลี่ยนตาม requirement และ dialog แสดงรายชื่อต่างกันตาม requirement — บันทึกผลใน ledger

---

### Task 4: เป้าหมายอาชีพแสดงเฉพาะเกณฑ์จริง

**Files:**
- Modify: `backend/src/controllers/career.controller.ts` (`parseMinimumGpa`, `getCareerTargetsHandler`), `src/pages/dashboards/StudentDashboard.tsx` (mapper ~255-285, การ์ด careers ~838-ท้าย block)
- Test: `backend/tests/career-targets.test.ts`

**Interfaces — Produces:** target `requirements: { gpa: number | null; skills: string[] }` · `readiness: { gpaMet: boolean | null; skillMatch: number }` (ไม่มี `technicalSkills` / `softSkills` / `skillScore` อีกแล้ว)

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("career targets", () => {
  it("only reports requirements the company actually wrote", async () => {
    const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    const stamp = Date.now();
    await prisma.jobPosting.create({ data: { companyId: company.id, title: `NoGpa ${stamp}`, type: "internship", description: "d", location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 86400000), requirements: ["Teamwork"], preferredSkills: ["React"], postedAt: new Date(Date.now() + 60000) } });
    await prisma.jobPosting.create({ data: { companyId: company.id, title: `Gpa ${stamp}`, type: "internship", description: "d", location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 86400000), requirements: ["GPA 3.25 ขึ้นไป"], preferredSkills: ["React"], postedAt: new Date(Date.now() + 60000) } });

    const res = await request(app).get("/api/career/targets").set("Authorization", `Bearer ${await loginAs("alice@student.showpro.local")}`);
    expect(res.status).toBe(200);
    const byRole = Object.fromEntries(res.body.targets.map((t: { role: string }) => [t.role, t]));
    expect(byRole[`NoGpa ${stamp}`].requirements).toEqual({ gpa: null, skills: ["React"] });
    expect(byRole[`NoGpa ${stamp}`].readiness.gpaMet).toBeNull();
    expect(byRole[`Gpa ${stamp}`].requirements.gpa).toBe(3.25);
    expect(JSON.stringify(res.body)).not.toMatch(/technicalSkills|softSkills|skillScore/);
  });
});
```
> ก่อนรัน: ตรวจ path จริงของ `getCareerTargetsHandler` ใน `career.routes.ts` แล้วแก้ URL · handler `take: 20` + `slice(0, 6)` เรียงตาม matchScore — ถ้างานทดสอบหลุดจาก 6 อันดับ ให้ใส่ `preferredSkills` เป็นทักษะที่ alice มีจริงใน seed

- [ ] **Step 2: รัน → FAIL** (gpa เป็น 3 เมื่อไม่ระบุ, มี technicalSkills)

- [ ] **Step 3: แก้ backend**
- `parseMinimumGpa` คืน `null` เมื่อไม่เจอ (แทน `3`)
- ลบ `scoreFromLevel`, `skillAverage`, `technicalMinimum`, `softMinimum` ถ้าไม่มีที่ใช้อื่น (grep ก่อนลบ)
- `requirements: { gpa: minimumGpa, skills: preferredSkills }`
- `readiness: { gpaMet: minimumGpa === null ? null : student.gpax >= minimumGpa, skillMatch: skillMatch.matchScore }` (ใช้ `gpax` ให้ตรงกับ talent search — audit ชี้ว่าเดิมใช้ `gpa`)

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

- [ ] **Step 5: แก้ `StudentDashboard.tsx`**
- mapper: `gpa: requirements.gpa === null || requirements.gpa === undefined ? null : asNumber(requirements.gpa, 0)` · ลบ `technicalSkills` / `softSkills` ของ requirement
- การ์ด: `isGpaMet = company.requirements.gpa === null ? true : student.gpax >= company.requirements.gpa` · ลบ `isTechMet` / `isSoftMet` และแถวแสดงเกณฑ์ technical/soft · แสดงแถว GPA เฉพาะเมื่อ `gpa !== null` · "Ready" = `isGpaMet && company.missingSkills.length === 0` · แสดงทักษะที่ตรง/ยังขาดจาก `matchedSkills` / `missingSkills` ที่ backend ส่งมาอยู่แล้ว
- ตรวจ type ใน `src/types/index.ts` ที่ใช้กับ requirement นี้ แล้วแก้ให้ `gpa: number | null` และลบ field ที่ไม่มีแล้ว

- [ ] **Step 6: ตรวจ** — tsc ไม่มี error ใหม่ · build ผ่าน · เปิดแท็บ careers ของ alice บน dev ดูว่าไม่มีเกณฑ์ technical/soft และงานที่ไม่ระบุ GPA ไม่มีแถว GPA — บันทึกใน ledger

---

### Task 5: InternTracking และ Cooperation ไม่ใช้ข้อมูลตัวอย่าง

**Files:**
- Modify: `src/pages/InternTracking.tsx` (ลบ `internsData` บรรทัด 24-86 และ `fallback` ใน mapper ~105-165), `src/pages/Cooperation.tsx` (วันที่ ~126-132, ผู้ประสานงาน ~178-195)
- Test: `e2e/no-demo-data.spec.ts`

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

const DEMO = /ณัฐพงษ์ ใจดี|Nattapong|วิไลลักษณ์ สวยงาม|Wilailak|สมชาย ดีมาก|Somchai Deemak/;

test("intern tracking shows only real interns", async ({ page }) => {
  await login(page, "talent@northernsoft.local");
  await page.goto("/intern-tracking");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(DEMO)).toHaveCount(0);
});

test("cooperation shows no hard-coded MOU dates or coordinator", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/cooperation");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/1 มกราคม 2567|31 ธันวาคม 2569|053-942-xxx|1 ปี 9 เดือน/)).toHaveCount(0);
});
```
> ก่อนรัน: ตรวจว่า `/intern-tracking` และ `/cooperation` เปิดได้ด้วย role ที่เลือก (`App.tsx` allowedRoles) ถ้าไม่ได้ให้เปลี่ยน role เป็นที่เปิดได้ · ถ้าบริษัท talent ไม่มีนักศึกษาฝึกงาน หน้าอาจไม่แสดงชื่อตัวอย่างอยู่แล้ว — ให้ใช้ role ที่เห็น record จริง (staff) เพื่อให้เทสต์ fail ก่อนแก้

- [ ] **Step 2: รัน → FAIL**

- [ ] **Step 3: แก้ InternTracking** — ลบ `internsData` · ประกาศ `type InternRow` ใหม่ตาม field ที่ใช้จริง · mapper ใช้ข้อมูลจาก API เท่านั้น: ชื่อ/บริษัท/ตำแหน่งจาก record · สัปดาห์ = `record.duration` และจำนวน log · คะแนนจาก `evaluation` ถ้าไม่มี → `null` และแสดง "ยังไม่มีผลประเมิน" · รายงานรายสัปดาห์จาก `logs` ถ้าว่าง → "ยังไม่มีบันทึก" · ห้ามดึงค่าจากนักศึกษาคนอื่น

- [ ] **Step 4: แก้ Cooperation** — วันเริ่ม = `currentMou.createdAt` · วันสิ้นสุดและเวลาที่เหลือ = จาก `expiryDate` (ถ้าไม่มี ซ่อนแถว) · เวลาที่เหลือคำนวณจาก `remainingDays` ที่มีอยู่แล้ว · ซ่อนกล่องผู้ประสานงานทั้งกล่อง (ระบบไม่มีข้อมูลนี้) · ลบ fallback `expiryDate: new Date()` ที่ทำให้หมดอายุวันนี้

- [ ] **Step 5: รันทั้งหมด** — E2E ไฟล์นี้ PASS · `npx playwright test` ทั้งหมด PASS (รวม role-pages, safe-links, auth-hardening, temp-credentials, company-jobs) · `npx vitest run src` PASS · `npm run build` ผ่าน · tsc ไม่มี error ใหม่ · ⚠️ รีสตาร์ต backend dev ก่อนรัน E2E
