# Audit F2: เกรดบันทึกถูกและคำนวณถูก Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** อาจารย์ตั้งเกณฑ์ให้คะแนนได้จริง กรอกได้เฉพาะเกรดที่ถูกต้อง บันทึกเป็นชุดแบบทั้งหมดหรือไม่มีเลย และคะแนนรวมไม่ถูกทับเมื่อกรอกบางเกณฑ์ · นักศึกษาเห็น GPA เทอมจริง GPAX ที่ไม่นับวิชาที่ถอน/ยังไม่มีเกรด transcript ที่ไม่มีวิชาที่ถอน คะแนนรายเกณฑ์ และประวัติ GPA ที่เรียงถูก

**Architecture:** backend: โมดูลกลาง `backend/src/services/gpa.ts` (ชุดเกรด, แต้ม, `computeGpa`, `termGpas`) ใช้ทั้งการคำนวณสถิติและ API · `bulkUpdateGrades` ตรวจทุกแถวก่อนแล้วเขียนใน transaction เดียว · schema วิชารับ `gradingCriteria`/`gradeCutoffs` · การถอน/ลงใหม่ตามนโยบาย · frontend: ใช้ `termGpa` จาก backend แทนการคำนวณเองที่นับวิชาไม่มีเกรดเป็น 0

**Tech Stack:** Express 4, Prisma 6, Zod, Vitest + supertest, React 18, Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` F2 · `2-backend-academic.md` (grade input validation, partial score overwrite, not atomic, dropped counted) · `4-frontend-student.md` (GPA this semester = GPAX, ungraded as 0, GPA history empty, transcript includes dropped, current term keyed wrong, ungraded shown as I, scores never shown, drop graded course) · `5-frontend-lecturer-staff.md` (grading settings stripped) · **การตัดสินของ Por 7/10/69:** เกรดที่รับ = A, B+, B, C+, C, D+, D, F (นับใน GPAX) + W, I (แสดงแต่ไม่นับ) · วิชาที่มีเกรดแล้วถอนไม่ได้ วิชาที่ถอนไม่นับใน GPAX/transcript ลงใหม่เริ่มศูนย์ · บันทึกเกรดเป็นชุด ถ้ามีแถวผิดไม่บันทึกเลยและบอกทุกแถวที่ผิด · คำนวณ GPA เทอมจริง (เทอม/ปีการศึกษาปัจจุบันของนักศึกษา)

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `0580e63`) · ห้าม commit/push ระหว่างรัน — Por อนุมัติตอนจบ
- เทสต์ใช้ DB `showpro_main_test` · ไม่มี migration
- ข้อความ error ภาษาอังกฤษ · ข้อความไทยห้ามมี letter-spacing · ตัวเลขบนจอบอกได้ว่ามาจากไหน
- ชุดเกรด: `COUNTED = A,B+,B,C+,C,D+,D,F` · `NOT_COUNTED = W,I` · แต้ม A=4 B+=3.5 B=3 C+=2.5 C=2 D+=1.5 D=1 F=0 · ผ่าน = A..D · cutoff ของวิชาใช้ได้เฉพาะ COUNTED

**Seed ที่เทสต์อ้างอิง:** narin สอน DII340 (alice A total 95, bob B+) · mali สอน DII420 (alice A, chompoo C+) · ตรวจ credits/semester/academicYear ของวิชาใน seed ก่อนเขียนค่าที่คาดหวัง · รหัส `Password123!`

## Review Focus

1. นักศึกษาที่ยังไม่มีวิชาไหนมีเกรดในเทอมปัจจุบัน → GPA เทอม = ไม่มีค่า (null/"-") ไม่ใช่ 0.00 (Task 1, Task 5)
2. บันทึกคะแนน 1 จาก 3 เกณฑ์ → total คิดจากคะแนนที่เก็บไว้ทุกเกณฑ์ ไม่ใช่เฉพาะที่ส่งมา (Task 2)
3. ชุดเกรดที่มี 1 แถวผิด → ไม่มีแถวไหนถูกบันทึก ไม่มี history/notification ออกไป (Task 2)
4. วิชาที่ได้ W หรือ I → อยู่ใน transcript แต่ไม่ถูกนับใน GPAX/GPA/หน่วยกิตที่ได้ (Task 1, Task 4)
5. ลงวิชาเดิมใหม่หลังถอน (ตอนยังไม่มีเกรด) → ไม่มีคะแนนเก่าค้าง (Task 4)

---

### Task 1: โมดูล GPA กลาง + คำนวณสถิติใหม่

**Files:**
- Create: `backend/src/services/gpa.ts`, `backend/tests/gpa.test.ts`
- Modify: `backend/src/services/grade.service.ts` (`gradePointMap`, `passingGrades`, `recalculateAcademicStats` → ใช้ gpa.ts)

**Interfaces — Produces:**
- `COUNTED_GRADES = ["A","B+","B","C+","C","D+","D","F"] as const` · `ALL_GRADES = [...COUNTED_GRADES, "W", "I"] as const` · `type LetterGrade = (typeof ALL_GRADES)[number]`
- `GRADE_POINTS: Record<CountedGrade, number>` · `isPassing(grade)`
- `type GradedRow = { letterGrade: string | null; credits: number; status: string; semester: number; academicYear: string }`
- `computeGpa(rows: GradedRow[]): { gpa: number | null; credits: number; earnedCredits: number }` — นับเฉพาะ `status !== "dropped"` และ `letterGrade ∈ COUNTED` · ไม่มีแถวนับ → `gpa: null` · ปัด 2 ตำแหน่ง
- `termGpas(rows: GradedRow[]): Array<{ semester: number; academicYear: string; gpa: number; credits: number }>` — เฉพาะเทอมที่มีแถวนับได้ · เรียงเก่า→ใหม่ (academicYear ตามตัวเลข แล้ว semester)

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/gpa.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { computeGpa, termGpas } from "../src/services/gpa";

const row = (letterGrade: string | null, credits = 3, extra: Partial<{ status: string; semester: number; academicYear: string }> = {}) => ({
  letterGrade, credits, status: "enrolled", semester: 1, academicYear: "2569", ...extra,
});

describe("computeGpa", () => {
  it("weights by credits over counted grades only", () => {
    expect(computeGpa([row("A", 3), row("C", 1)])).toEqual({ gpa: 3.5, credits: 4, earnedCredits: 4 });
  });
  it("ignores ungraded, W, I and dropped rows; F counts in GPA but earns no credit", () => {
    expect(computeGpa([row("B"), row(null), row("W"), row("I"), row("A", 3, { status: "dropped" }), row("F")])).toEqual({ gpa: 1.5, credits: 6, earnedCredits: 3 });
  });
  it("is null when nothing counts", () => {
    expect(computeGpa([row(null), row("W")]).gpa).toBeNull();
  });
});

describe("termGpas", () => {
  it("one entry per term with counted grades, oldest first", () => {
    const rows = [row("A", 3, { semester: 1, academicYear: "2569" }), row("B", 3, { semester: 2, academicYear: "2568" }), row(null, 3, { semester: 2, academicYear: "2569" })];
    expect(termGpas(rows)).toEqual([
      { semester: 2, academicYear: "2568", gpa: 3, credits: 3 },
      { semester: 1, academicYear: "2569", gpa: 4, credits: 3 },
    ]);
  });
});
```

- [ ] **Step 2: รัน → FAIL** (module not found) — `cd backend && npx vitest run tests/gpa.test.ts`

- [ ] **Step 3: เขียน `backend/src/services/gpa.ts`**

```ts
export const COUNTED_GRADES = ["A", "B+", "B", "C+", "C", "D+", "D", "F"] as const;
export const ALL_GRADES = [...COUNTED_GRADES, "W", "I"] as const;
export type CountedGrade = (typeof COUNTED_GRADES)[number];
export type LetterGrade = (typeof ALL_GRADES)[number];

export const GRADE_POINTS: Record<CountedGrade, number> = { A: 4, "B+": 3.5, B: 3, "C+": 2.5, C: 2, "D+": 1.5, D: 1, F: 0 };

const isCounted = (grade: string | null): grade is CountedGrade =>
  grade !== null && (COUNTED_GRADES as readonly string[]).includes(grade);
export const isPassing = (grade: string | null) => isCounted(grade) && grade !== "F";

export type GradedRow = { letterGrade: string | null; credits: number; status: string; semester: number; academicYear: string };

/** W, I, ungraded and dropped enrollments are shown on transcripts but never counted. */
export const computeGpa = (rows: GradedRow[]) => {
  const counted = rows.filter((r) => r.status !== "dropped" && isCounted(r.letterGrade));
  const credits = counted.reduce((sum, r) => sum + r.credits, 0);
  const points = counted.reduce((sum, r) => sum + GRADE_POINTS[r.letterGrade as CountedGrade] * r.credits, 0);
  const earnedCredits = counted.filter((r) => isPassing(r.letterGrade)).reduce((sum, r) => sum + r.credits, 0);
  return { gpa: credits > 0 ? Number((points / credits).toFixed(2)) : null, credits, earnedCredits };
};

export const termGpas = (rows: GradedRow[]) => {
  const terms = new Map<string, GradedRow[]>();
  for (const r of rows) {
    const key = `${r.academicYear}|${r.semester}`;
    terms.set(key, [...(terms.get(key) ?? []), r]);
  }
  return Array.from(terms.values())
    .map((termRows) => ({ semester: termRows[0].semester, academicYear: termRows[0].academicYear, ...computeGpa(termRows) }))
    .filter((t) => t.gpa !== null)
    .sort((a, b) => Number(a.academicYear) - Number(b.academicYear) || a.semester - b.semester)
    .map(({ semester, academicYear, gpa, credits }) => ({ semester, academicYear, gpa: gpa as number, credits }));
};
```

- [ ] **Step 4: รัน → PASS**

- [ ] **Step 5: `recalculateAcademicStats` ใช้ gpa.ts** — เทสต์เพิ่มใน `backend/tests/gpa.test.ts`:

```ts
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("student GPA/GPAX after grading", () => {
  it("GPAX skips dropped and W/I; GPA is the student's current term only", async () => {
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    const res = await request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`)
      .send({ grades: [{ studentId: bob.id, courseId: dii340.id, letterGrade: "W" }] });
    expect(res.status).toBeLessThan(300);
    const after = await prisma.studentProfile.findUniqueOrThrow({ where: { id: bob.id } });
    const rows = await prisma.enrollment.findMany({ where: { studentId: bob.id }, include: { course: true } });
    const counted = rows.filter((r) => r.status !== "dropped" && r.letterGrade && !["W", "I"].includes(r.letterGrade));
    if (counted.length === 0) expect(after.gpax).toBe(0);
    const term = counted.filter((r) => r.course.semester === after.semester && r.course.academicYear === after.academicYear);
    if (term.length === 0) expect(after.gpa).toBe(0);
  });
});
```
> ก่อนรัน: ตรวจ path ของ bulk grade ใน `academic.routes.ts` (เช่น `/grades/bulk`) และ body ที่ `gradeBulkSchema` ต้องการ · `StudentProfile.gpa`/`gpax` เป็น Float ไม่ null ได้ → เก็บ 0 เมื่อ `computeGpa` คืน null (API/หน้าเว็บแยก "ไม่มีค่า" จาก `termGpa` ใน Task 4) · ถ้า seed ทำให้ assertion แบบ `if` ไม่ถูกเรียกเลย ให้เปลี่ยนเป็นค่าที่คำนวณได้จริงจาก seed และบันทึกใน ledger (เทสต์ห้ามผ่านแบบไม่ assert อะไร)

`recalculateAcademicStats(studentId)`: ดึง enrollment ทั้งหมดพร้อม course + โปรไฟล์ (semester, academicYear) → `rows` → `all = computeGpa(rows)` → `term = computeGpa(rows.filter(ตรง semester+academicYear ของนักศึกษา))` → update `{ gpax: all.gpa ?? 0, gpa: term.gpa ?? 0, earnedCredits: all.earnedCredits }` · ลบ `gradePointMap`/`passingGrades` เดิม

- [ ] **Step 6: รัน → PASS** · ทั้งชุด · tsc

---

### Task 2: บันทึกเกรด — ตรวจครบ, ทั้งชุดหรือไม่มีเลย, total ไม่ถูกทับ

**Files:**
- Modify: `backend/src/schemas/academic.schema.ts` (`gradeBulkSchema`), `backend/src/services/grade.service.ts` (`bulkUpdateGrades`)
- Test: `backend/tests/grade-entry.test.ts`

**Interfaces — Consumes:** `ALL_GRADES`, `COUNTED_GRADES` (Task 1)

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

let narin: string;
let dii340: { id: string };
let alice: { id: string };
let bob: { id: string };
const post = (grades: unknown[]) => request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${narin}`).send({ grades });

beforeAll(async () => {
  narin = await loginAs("narin@showpro.local");
  dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
  alice = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "alice@student.showpro.local" } } });
  bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
});

describe("grade validation", () => {
  it.each([{ letterGrade: "A+" }, { letterGrade: "Z" }, { total: 140 }, { total: -1 }])("rejects %o", async (bad) => {
    expect((await post([{ studentId: bob.id, courseId: dii340.id, ...bad }])).status).toBe(400);
  });

  it("rejects a criterion from another course and a score above the criterion's max", async () => {
    const other = await prisma.courseGradingCriteria.findFirstOrThrow({ where: { courseId: { not: dii340.id } } });
    const own = await prisma.courseGradingCriteria.findFirstOrThrow({ where: { courseId: dii340.id } });
    expect((await post([{ studentId: bob.id, courseId: dii340.id, scores: [{ criteriaId: other.id, score: 10 }] }])).status).toBe(400);
    expect((await post([{ studentId: bob.id, courseId: dii340.id, scores: [{ criteriaId: own.id, score: own.maxScore + 1 }] }])).status).toBe(400);
  });
});

describe("all or nothing", () => {
  it("one bad row saves nothing and reports every bad row", async () => {
    const before = await prisma.enrollment.findMany({ where: { courseId: dii340.id }, orderBy: { id: "asc" } });
    const historyBefore = await prisma.gradeHistory.count();
    const res = await post([
      { studentId: alice.id, courseId: dii340.id, letterGrade: "C" },
      { studentId: bob.id, courseId: dii340.id, letterGrade: "Q" },
    ]);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Q|letterGrade/);
    const after = await prisma.enrollment.findMany({ where: { courseId: dii340.id }, orderBy: { id: "asc" } });
    expect(after.map((e) => e.letterGrade)).toEqual(before.map((e) => e.letterGrade));
    expect(await prisma.gradeHistory.count()).toBe(historyBefore);
  });

  it("an enrollment that does not exist rejects the whole batch", async () => {
    const res = await post([
      { studentId: alice.id, courseId: dii340.id, letterGrade: "B" },
      { studentId: "no-such-student", courseId: dii340.id, letterGrade: "B" },
    ]);
    expect([400, 404]).toContain(res.status);
    expect((await prisma.enrollment.findFirstOrThrow({ where: { studentId: alice.id, courseId: dii340.id } })).letterGrade).not.toBe("B");
  });
});

describe("partial score entry", () => {
  it("total is recomputed from every stored criterion score, not only the ones sent", async () => {
    const criteria = await prisma.courseGradingCriteria.findMany({ where: { courseId: dii340.id }, orderBy: { orderIndex: "asc" } });
    expect(criteria.length).toBeGreaterThanOrEqual(2);
    const [c1, c2] = criteria;
    await post([{ studentId: bob.id, courseId: dii340.id, scores: [{ criteriaId: c1.id, score: c1.maxScore }, { criteriaId: c2.id, score: c2.maxScore }] }]);
    const full = (await prisma.enrollment.findFirstOrThrow({ where: { studentId: bob.id, courseId: dii340.id } })).total!;
    await post([{ studentId: bob.id, courseId: dii340.id, scores: [{ criteriaId: c1.id, score: c1.maxScore }] }]);
    const afterPartial = (await prisma.enrollment.findFirstOrThrow({ where: { studentId: bob.id, courseId: dii340.id } })).total!;
    expect(afterPartial).toBe(full);
  });
});
```
> ก่อนรัน: ตรวจ path bulk grade · ตรวจว่า seed มี `CourseGradingCriteria` ของ DII340 อย่างน้อย 2 เกณฑ์และมีของวิชาอื่น (`createCourse` สร้าง default criteria ให้เมื่อไม่ส่งมา — ถ้า seed ไม่ได้ผ่าน createCourse อาจไม่มี) ถ้าไม่มี ให้สร้างใน `beforeAll` ด้วย prisma แล้วบันทึกใน ledger · เทสต์ "all or nothing" ต้องเห็น alice ยังไม่ถูกเปลี่ยนเป็น C

- [ ] **Step 2: รัน → FAIL**

- [ ] **Step 3: แก้ schema** — `gradeBulkSchema` item: `letterGrade: z.enum(ALL_GRADES).optional()` · `total: z.coerce.number().min(0).max(100).optional()` · `scores: z.array(z.object({ criteriaId: z.string().min(1), score: z.coerce.number().min(0) })).optional()` · `grades: z.array(...).min(1)`

- [ ] **Step 4: แก้ `bulkUpdateGrades`** — แยกเป็น 2 ช่วง:
1. **ตรวจ (ไม่เขียนอะไร):** สำหรับทุกแถว หา enrollment (ไม่พบ → เก็บ error) · ownership อาจารย์ (403 ทั้งชุดเหมือนเดิม) · enrollment ที่ `status === "dropped"` → error · `scores[].criteriaId` ต้องอยู่ใน `enrollment.course.gradingCriteria` และ `score <= maxScore` → error · ถ้ามี error ใดๆ → `throw new AppError(400, "Some grade rows are invalid", { rows: errors })` (errors = `[{ index, studentId, message }]`)
2. **เขียนใน `prisma.$transaction` เดียว:** สำหรับทุกแถว upsert scores → อ่าน scores ทั้งหมดของ enrollment (ใน tx) → `total` = ผลรวม `(score/maxScore)*weight` ของ**ทุก**เกณฑ์ที่มีคะแนน (ถ้าแถวมี `scores`) · ถ้าไม่มี `scores` ใช้ `grade.total` ถ้าส่งมา ไม่งั้นคงค่าเดิม · letter = ที่ส่งมา หรือจาก cutoff เมื่อมี total · update enrollment · สร้าง gradeHistory + timelineEvent ใน tx เดียวกัน
3. **หลัง commit:** audit log, notification, `recalculateAcademicStats` ของนักศึกษาที่เกี่ยวข้อง (unique)

- [ ] **Step 5: รัน → PASS** · ทั้งชุด · tsc

---

### Task 3: เกณฑ์ให้คะแนนของวิชาบันทึกได้จริง

**Files:**
- Modify: `backend/src/schemas/academic.schema.ts` (`courseCreateSchema`, `courseUpdateSchema` — เพิ่ม `gradingCriteria`, `gradeCutoffs`)
- Test: `backend/tests/course-grading-settings.test.ts`, `e2e/grading-settings.spec.ts`

**Interfaces — Consumes:** `COUNTED_GRADES` (Task 1)

- [ ] **Step 1: เทสต์ backend ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("course grading settings", () => {
  it("the owning lecturer can save criteria and cutoffs and they persist", async () => {
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    const res = await request(app).patch(`/api/courses/${dii340.id}`).set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`).send({
      gradingCriteria: [
        { name: "Midterm", weightPercentage: 40, maxScore: 100, orderIndex: 0 },
        { name: "Final", weightPercentage: 60, maxScore: 100, orderIndex: 1 },
      ],
      gradeCutoffs: [{ grade: "A", minScore: 80 }, { grade: "B", minScore: 70 }, { grade: "C", minScore: 60 }, { grade: "D", minScore: 50 }],
    });
    expect(res.status).toBe(200);
    const saved = await prisma.courseGradingCriteria.findMany({ where: { courseId: dii340.id }, orderBy: { orderIndex: "asc" } });
    expect(saved.map((c) => [c.name, c.weightPercentage])).toEqual([["Midterm", 40], ["Final", 60]]);
    expect((await prisma.courseGradeCutoff.findMany({ where: { courseId: dii340.id } })).length).toBe(4);
  });

  it.each([
    { gradingCriteria: [{ name: "x", weightPercentage: 120, maxScore: 100 }] },
    { gradingCriteria: [{ name: "x", weightPercentage: 60, maxScore: 0 }] },
    { gradeCutoffs: [{ grade: "W", minScore: 10 }] },
    { gradeCutoffs: [{ grade: "A", minScore: 150 }] },
  ])("rejects %o", async (bad) => {
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    const res = await request(app).patch(`/api/courses/${dii340.id}`).set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`).send(bad);
    expect(res.status).toBe(400);
  });
});
```
> หมายเหตุ: การเปลี่ยนเกณฑ์จะลบเกณฑ์เดิมที่ไม่มี id (ดู `updateCourse`) และคะแนนนักศึกษาที่ผูกกับเกณฑ์นั้น (`onDelete: Cascade`) — ตรวจพฤติกรรมนี้ใน `course.service.ts` แล้วบันทึกใน ledger ว่าเป็นของเดิม · เทสต์นี้แก้ seed ของ DII340 — ถ้าทำให้เทสต์ Task 2 (partial score) พังเพราะลำดับไฟล์ ให้ Task 2 สร้างเกณฑ์ของตัวเองใน beforeAll

- [ ] **Step 2: รัน → FAIL** (ค่าเดิมไม่เปลี่ยน เพราะ zod ตัด key ทิ้ง)

- [ ] **Step 3: แก้ schema**

```ts
const gradingCriterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  weightPercentage: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().positive(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});
const gradeCutoffSchema = z.object({
  grade: z.enum(COUNTED_GRADES),
  minScore: z.coerce.number().min(0).max(100),
});
```
เพิ่มใน `courseCreateSchema` และ `courseUpdateSchema`: `gradingCriteria: z.array(gradingCriterionSchema).optional()`, `gradeCutoffs: z.array(gradeCutoffSchema).optional()` (ผลรวมน้ำหนัก > 100 ตรวจใน service อยู่แล้ว)

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

- [ ] **Step 5: E2E** — `e2e/grading-settings.spec.ts`: narin เปิด `/courses/<DII340 id>/grading` → เปลี่ยนน้ำหนักเกณฑ์แรก → กดบันทึก → reload → ค่าที่เปลี่ยนยังอยู่ (ก่อนแก้ toast ขึ้นสำเร็จแต่ reload แล้วค่าหาย) · ตรวจ selector จริงในหน้า `CourseGradingSettings.tsx` ก่อนเขียน · หา course id ผ่าน `GET /api/courses/DII340`

---

### Task 4: ถอน/ลงใหม่ + transcript/stats ไม่นับวิชาที่ถอน + termGpa + คะแนนรายเกณฑ์

**Files:**
- Modify: `backend/src/services/enrollment.service.ts` (`dropCourseByStudent`, reactivate ใน create), `backend/src/services/academic-core.service.ts` (`getStudentTranscript`), `backend/src/controllers/documents.controller.ts` (`getTranscript` PDF), `backend/src/controllers/students.controller.ts` (`getStudentStatsHandler`: `gradeHistory` ไม่เอาวิชาที่ถอน + เพิ่ม `termGpa`, `currentTermGpa`)
- Test: `backend/tests/drop-and-transcript.test.ts`

**Interfaces — Consumes:** `termGpas`, `computeGpa` (Task 1) · **Produces:** `GET /students/stats` → `stats.termGpa: Array<{semester, academicYear, gpa, credits}>` (เก่า→ใหม่), `stats.currentTermGpa: number | null` · transcript rows มี `scores: [{ criteriaId, score, criteria: { name, weightPercentage, maxScore } }]`

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;

/** a fresh ungraded course bob is enrolled in, owned by narin, in bob's current term */
const ungradedCourseForBob = async () => {
  const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  const code = `T${Date.now()}`.slice(0, 10);
  const course = await prisma.course.create({
    data: { code, name: code, nameThai: code, credits: 3, semester: bob.semester, academicYear: bob.academicYear, year: 3, lecturerId: narin.id, status: "active",
      gradingCriteria: { create: [{ name: "Work", weightPercentage: 100, maxScore: 100, orderIndex: 0 }] } },
    include: { gradingCriteria: true },
  });
  const enrollment = await prisma.enrollment.create({ data: { studentId: bob.id, courseId: course.id } });
  return { bob, course, enrollment };
};

describe("dropping", () => {
  it("a graded course cannot be dropped", async () => {
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    const res = await request(app).delete(`/api/enrollments/course/${dii340.id}`).set("Authorization", await as("alice@student.showpro.local"));
    expect(res.status).toBe(409);
    expect((await prisma.enrollment.findFirstOrThrow({ where: { courseId: dii340.id, student: { user: { email: "alice@student.showpro.local" } } } })).status).not.toBe("dropped");
  });

  it("re-enrolling after dropping an ungraded course starts clean", async () => {
    const { course, enrollment } = await ungradedCourseForBob();
    await prisma.enrollmentScore.create({ data: { enrollmentId: enrollment.id, criteriaId: course.gradingCriteria[0].id, score: 55 } });
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { total: 55 } });
    const auth = await as("bob@student.showpro.local");
    expect((await request(app).delete(`/api/enrollments/course/${course.id}`).set("Authorization", auth)).status).toBe(200);
    expect((await request(app).post("/api/enrollments").set("Authorization", auth).send({ courseId: course.id })).status).toBeLessThan(300);
    const again = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(again.status).toBe("enrolled");
    expect(again.total).toBeNull();
    expect(again.letterGrade).toBeNull();
    expect(await prisma.enrollmentScore.count({ where: { enrollmentId: enrollment.id } })).toBe(0);
  });
});

describe("transcript and stats", () => {
  it("dropped enrollments are not on the transcript or in grade history", async () => {
    const { course } = await ungradedCourseForBob();
    const auth = await as("bob@student.showpro.local");
    expect((await request(app).delete(`/api/enrollments/course/${course.id}`).set("Authorization", auth)).status).toBe(200);
    const transcript = await request(app).get("/api/student/transcript").set("Authorization", auth);
    const stats = await request(app).get("/api/students/stats").set("Authorization", auth);
    expect(JSON.stringify(transcript.body)).not.toContain(course.code);
    expect(JSON.stringify(stats.body.stats.gradeHistory)).not.toContain(course.code);
  });

  it("stats return term GPAs oldest first and the current term GPA", async () => {
    const res = await request(app).get("/api/students/stats").set("Authorization", await as("alice@student.showpro.local"));
    const terms = res.body.stats.termGpa as Array<{ semester: number; academicYear: string; gpa: number }>;
    expect(terms.length).toBeGreaterThan(0); // alice has graded courses in the seed
    const keys = terms.map((t) => Number(t.academicYear) * 10 + t.semester);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    expect("currentTermGpa" in res.body.stats).toBe(true);
  });

  it("transcript rows carry per-criterion scores", async () => {
    const res = await request(app).get("/api/student/transcript").set("Authorization", await as("alice@student.showpro.local"));
    expect(res.body.transcript.length).toBeGreaterThan(0);
    expect(res.body.transcript.every((r: { scores?: unknown }) => Array.isArray(r.scores))).toBe(true);
  });
});
```
> ก่อนรัน: ตรวจ field บังคับของ `Course` ใน Prisma (ถ้าต้องมีมากกว่าที่ใส่ใน `ungradedCourseForBob` ให้เติม) · route ถอน = `DELETE /api/enrollments/course/:courseId` (student) · ลงทะเบียน = `POST /api/enrollments { courseId }` — ถ้าวิชาไม่มี section แล้ว create ล้ม ให้สร้าง section ใน helper ด้วย

- [ ] **Step 2: รัน → FAIL**

- [ ] **Step 3: แก้โค้ด**
- `dropCourseByStudent`: หลังหา enrollment → ถ้า `letterGrade !== null` → `throw new AppError(409, "A graded course cannot be dropped")`
- reactivate ใน create enrollment (`existing` ที่ `status === "dropped"`): ใน transaction → `enrollmentScore.deleteMany({ where: { enrollmentId } })` และ update `{ status: "enrolled", sectionId, total: null, letterGrade: null, remarks: null, gradedBy: null, gradedAt: null }`
- `getStudentTranscript`: `where: { studentId, status: { not: "dropped" } }` + `include: { course: true, section: true, scores: { include: { criteria: true } } }`
- `getTranscript` (PDF): `where` เพิ่ม `status: { not: "dropped" }`
- `getStudentStatsHandler`: query enrollment เพิ่ม `status: { not: "dropped" }` · สร้าง `rows: GradedRow[]` → `termGpa = termGpas(rows)` · `currentTermGpa = computeGpa(rows ที่ตรงเทอมปัจจุบัน).gpa` · ใส่ทั้งสองใน `stats`

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

---

### Task 5: หน้าเว็บเกรดของนักศึกษา

**Files:**
- Modify: `src/pages/Grades.tsx` (เทอมปัจจุบัน ~352-380, การ์ด GPA เทอม ~461-470, คะแนนรายเกณฑ์ ~575-590), `src/lib/live-mappers.ts` (`mapGrade` map `scores`), `src/pages/dashboards/StudentDashboard.tsx` (`letterGrade || 'I'` ~96, semesterHistory ~277-345), `src/pages/PersonalDashboard.tsx` (`letterGrade || 'I'` ~67, gpaHistory ~386-395), `src/types/index.ts` (ถ้า Grade ต้องมี scores)
- Test: `e2e/student-grades.spec.ts`

**Interfaces — Consumes:** `stats.termGpa`, `stats.currentTermGpa`, transcript `scores` (Task 4)

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

test("grades page shows the real term GPA (or '-') and never invents an 'I' grade", async ({ page, request }) => {
  await login(page, "alice@student.showpro.local");
  const token = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const stats = (await (await request.get("http://localhost:4000/api/students/stats", { headers: { Authorization: `Bearer ${token}` } })).json()).stats;
  await page.goto("/grades");
  await page.waitForLoadState("networkidle");
  const main = page.locator("main");
  const expected = stats.currentTermGpa === null ? "-" : Number(stats.currentTermGpa).toFixed(2);
  await expect(main.getByTestId("term-gpa")).toHaveText(expected);
  await expect(main.getByTestId("gpax")).toHaveText(Number(stats.gpax).toFixed(2));
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").getByText(/^I$/)).toHaveCount(0);
});

test("the GPA history chart has one point per graded term", async ({ page, request }) => {
  await login(page, "alice@student.showpro.local");
  const token = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const stats = (await (await request.get("http://localhost:4000/api/students/stats", { headers: { Authorization: `Bearer ${token}` } })).json()).stats;
  await page.goto("/personal-dashboard");
  await page.waitForLoadState("networkidle");
  // the history must not be empty when the student has graded terms
  if (stats.termGpa.length > 0) {
    await expect(page.locator("main").getByText(/ไม่มีข้อมูล|No data/i)).toHaveCount(0);
  }
});
```
> ก่อนรัน: เพิ่ม `data-testid="term-gpa"` และ `data-testid="gpax"` ที่ตัวเลขใน Grades.tsx (~448, ~468) — เป็นการเพิ่ม hook ทดสอบ ไม่ใช่พฤติกรรม · ตรวจว่า `/personal-dashboard` เปิดได้ด้วย student และข้อความว่างของการ์ดประวัติ GPA คืออะไรจริง แล้วแก้ regex · ถ้า alice ไม่มีเทอมที่มีเกรดใน seed เทสต์ข้อ 2 จะไม่ assert — ให้ใช้ข้อมูลที่มีเทอมมีเกรด หรือสร้างด้วย API bulk grade ก่อน (ห้ามผ่านแบบไม่ assert)

- [ ] **Step 2: รัน → FAIL**

- [ ] **Step 3: แก้**
- Grades.tsx: เทอมปัจจุบัน = `semester === student.semester && academicYear === student.academicYear` · การ์ด "GPA เทอมนี้" ใช้ `stats.currentTermGpa` (null → "-") · รายการเทอมใช้ `stats.termGpa` (ไม่คำนวณเองที่นับวิชาไม่มีเกรดเป็น 0) · แสดงคะแนนรายเกณฑ์จาก `grade.scores` (ชื่อเกณฑ์ คะแนน/เต็ม)
- `mapGrade`: map `scores` (`criteriaId`, `score`, `criteria.name`, `criteria.maxScore`, `criteria.weightPercentage`)
- StudentDashboard/PersonalDashboard: `letterGrade || 'I'` → แสดง "-" / "ยังไม่มีเกรด" · semesterHistory และ gpaHistory ใช้ `stats.termGpa` (เรียงเก่า→ใหม่แล้ว) แทนการอ่าน `row.gpa` ที่ไม่มีจริง
- ตรวจจุดอื่นที่ใช้ `student.gpa` เป็น "GPA เทอม" (grep `\.gpa\b`) ให้ตรงความหมายใหม่ (`gpa` = เทอมปัจจุบัน, `gpax` = สะสม)

- [ ] **Step 4: รันทั้งหมด** — E2E ไฟล์นี้ + `e2e/grading-settings.spec.ts` PASS · `npx playwright test` ทั้งหมด PASS · unit `src/lib/*.test.ts` (ยกเว้น `import-mapping.test.ts` ของทีม) PASS · build ผ่าน · tsc ไม่มี error ใหม่ (baseline 3) · ⚠️ รีสตาร์ต backend dev ก่อน E2E
