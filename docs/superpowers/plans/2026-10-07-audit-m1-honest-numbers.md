# Audit M1: ตัวเลขบนจอต้องจริง Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ตัวเลขทุกตัวที่ M1 ชี้ว่าแต่งขึ้น ต้องมาจากข้อมูลจริงพร้อมบอกที่มา หรือถูกเอาออก · ไม่มีค่าตั้งต้นที่ดูเหมือนข้อมูล

**Architecture:** backend `/students/stats` ส่งรูปข้อมูลใหม่ที่แยก "rubric จริง" กับ "ประเมินตัวเอง" และส่งหน่วยกิตรวมแทนยอดต่อหมวด · การ์ดหน้าเว็บอ่านรูปใหม่และแสดง "ยังไม่มีการประเมิน" แทนการเติมเลข · หน้าอาจารย์/staff ใช้ข้อมูล workload/ตาราง/ที่ปรึกษาจริง ไม่มีป้าย "เกิน" · หน้า landing/privacy ตัดของที่ไม่มีแหล่ง

**Tech Stack:** Express + Prisma, Vitest + supertest, React 18, Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` M1 · `2-backend-academic.md` ("/students/stats presents fabricated numbers") · `4-frontend-student.md` (95%, skill bars, professor/peer, PersonalDashboard relabel) · `5-frontend-lecturer-staff.md` (Workload, WorkloadTracking) · `6-frontend-admin-company-shell.md` (Landing, PrivacyPolicy) · **การตัดสินของ Por 7/10/69:**
- rubric: **เอาแค่คะแนนอาจารย์** (Por 7/10/69) — ทุกตัวเลข rubric มาจาก `professorScore` เท่านั้น · ไม่แสดง/ไม่ใช้ `peerScore` และ `totalScore` (totalScore รวมคะแนนเพื่อนไว้) · คอลัมน์ใน DB คงไว้ ไม่ migration · มี rubric ค่อยแสดง · ไม่มี = "ยังไม่มีการประเมินจากอาจารย์" และแสดงระดับที่นักศึกษาประเมินตัวเองแยกชัด · ตัดน้ำหนัก 60/40, comment tags, จำนวนคอมเมนต์ที่ตายตัว, คำว่า "เพื่อน/Peer" ทั้งหมด · หน้าให้อาจารย์กรอก rubric = ไว้ทีหลัง (นอกขอบเขต)
- หน่วยกิต: นับตามหน่วยกิตจริงของวิชา (วิชา 6 หน่วยกิตนับ 6) · **ไม่แบ่งหมวด** (Course ไม่มีฟิลด์หมวด ตอนนี้เดาจากรหัส) · แสดงผ่านแล้ว / กำลังเรียน / คงเหลือ เทียบ `requiredCredits` รวมก้อนเดียว · ไม่นับวิชาถอน
- การ์ด "ความสมบูรณ์ portfolio 95%" = เอาออก
- landing: ตัวเลข 5,000+/200+/98%/4.9 และชื่อบริษัทพันธมิตร = เอาออก · privacy: ป้าย PDPA Compliant / ISO 27001 และข้อความเข้ารหัส AES = เอาออก
- เกณฑ์ "ภาระงานเกิน" = ยังไม่มีเกณฑ์จากคณะ → ตัดป้าย/ตัวนับ "เกิน" ทุกหน้า แสดงชั่วโมงจริงแยกประเภท
- แก้ได้โดยไม่ต้องถาม: GPA เฉลี่ยตัดคนที่ยังไม่มีเกรด · แถบทักษะแสดงระดับแทน % · ตัดการเอาค่าอื่นมาติดป้ายใหม่ใน PersonalDashboard · Workload ใช้เทอม/ตาราง/จำนวนที่ปรึกษาจริง

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `b5b7118`) · **ห้าม commit/push ระหว่างรัน**
- ไม่มี migration
- ข้อความไทยห้าม letter-spacing (ห้าม `tracking-*` บนข้อความไทยใหม่) · ตัวเลขบนจอบอกหน่วย/ขอบเขต/ที่มา
- ห้ามใช้ค่าตั้งต้นที่เป็นตัวเลขแทน "ไม่มีข้อมูล" — ใช้ `null` แล้วแสดง "-" หรือข้อความ
- E2E ใช้ dev DB · รีสตาร์ต backend dev ก่อน E2E

**Seed:** นักศึกษา `alice@student.showpro.local` (65010001), `chompoo@student.showpro.local` · อาจารย์ narin, mali · staff `staff@showpro.local` · รหัส `Password123!` · seed มี `SkillRubric` บางแถว (ดู `backend/prisma/seed.ts`)

## Review Focus

1. นักศึกษาที่ไม่มี SkillRubric → ไม่เห็นตัวเลขคะแนนอาจารย์ใดๆ · ไม่มีคำ "เพื่อน/Peer" และไม่มีค่าที่มาจาก `peerScore`/`totalScore` ทุกกรณี (Task 1, Task 2)
2. หน่วยกิตผ่านแล้ว + กำลังเรียน + คงเหลือ = `requiredCredits` (เมื่อยังไม่เกิน) และวิชาที่ถอนไม่ถูกนับ (Task 1, Task 3)
3. หน้า Workload ของอาจารย์ที่ไม่มี workload record → แสดง "-" ไม่ใช่ 0 หรือค่าตั้งต้น · ตารางสอนวันที่หาไม่เจอไม่ถูกเติม (Task 5)
4. GPA เฉลี่ยบอกว่าคิดจากกี่คน และไม่นับคนที่ยังไม่มีเกรด (Task 5)

---

### Task 1: backend `/students/stats` — rubric จริงแยกจากประเมินตัวเอง, หน่วยกิตรวม

**Files:**
- Modify: `backend/src/controllers/students.controller.ts` (stats handler ~บรรทัด 600–775: `skillScoreFallback`, `technicalSummary`, `softSummary`, `categoryCredits`, `categoryTotals`, `curriculumCourses`)
- Create: `backend/tests/student-stats-honest.test.ts`

- [ ] **Step 1: เทสต์แดง**
  - นักศึกษาใหม่ (ไม่มี rubric) มีทักษะ technical 2 อย่าง (`advanced`, `beginner`) + soft 1 อย่าง → `GET /api/students/stats` (token ของตัวเอง):
    - `skillSummary.technical.rubric === null` · `skillSummary.technical.selfAssessed` = `{ average: <ค่าเฉลี่ย skillLevelScore>, count: 2 }`
    - `skillSummary.soft.rubric === null` · `soft.selfAssessed.count === 1` · `soft.feedbackHistory` = `[]`
    - ไม่มีคีย์ `professorWeight`, `peerWeight`, `commentTags` ที่ใดใน `skillSummary`
  - เพิ่ม `SkillRubric` technical 1 แถว (prisma ตรง, ชื่อ "React web", professorScore 4, peerScore 3, totalScore 3.6) → `technical.rubric` = `{ count: 1, professorScore: 4, functionality: 4, readability: null, bestPractice: null }` · ไม่มีคีย์ `peerScore` ใดใน `skillSummary` (มิติใช้ professorScore ไม่ใช่ totalScore · มิติที่ไม่มี rubric ตรง = `null` ไม่ใช่ fallback)
  - หน่วยกิต: ลงวิชา A 6 หน่วยกิต (มีเกรด B), วิชา B 3 หน่วยกิต (enrolled ไม่มีเกรด), วิชา C 3 หน่วยกิต (dropped) → `curriculumProgress` = `{ requiredCredits: 120, completedCredits: 6, inProgressCredits: 3, courses: [2 วิชา] }` · ไม่มีคีย์ `categoryTotals` · courses ไม่มี `category`
  - รัน `cd backend && npx vitest run tests/student-stats-honest.test.ts` → แดง
- [ ] **Step 2: แก้**
  - `rubricSummary(rubrics, dims)` คืน `null` ถ้าไม่มีแถว · ไม่งั้น `{ count, professorScore, ...มิติ }` โดย professorScore = เฉลี่ย professorScore ทุกแถว และแต่ละมิติ = เฉลี่ย **professorScore** ของแถวที่ชื่อตรงคำ หรือ `null` · ไม่อ่าน peerScore/totalScore
  - `selfAssessed` = `{ average: เฉลี่ย skillLevelScore หรือ null ถ้าไม่มีทักษะ, count }` — soft ใช้ `category === "soft_skill"`, technical = ที่เหลือ
  - soft rubric กรองด้วย `category` ที่เป็น `"soft"` หรือ `"soft_skill"` (เดิมไม่ตรงกัน) · `feedbackHistory` เปลี่ยนชื่อเป็น `assessments` จาก rubric จริงเท่านั้น: `{ skillName, date, professorScore }` (ตัด communicationScore/opennessScore ที่เติม fallback และ `comments`)
  - ลบ `courseCategory`, `categoryCredits`, `categoryTotals` ออกจาก stats · `completedCredits` = ผลรวมหน่วยกิตของวิชาที่มี letterGrade (ไม่นับ `W`) · `inProgressCredits` = `status === "enrolled"` และไม่มีเกรด · courses คงฟิลด์อื่นไว้
  - ตรวจว่า `courseCategory` ไม่มีที่อื่นใช้ ก่อนลบ (grep)
- [ ] **Step 3:** รันไฟล์ → เขียว · `npm test` ทั้งชุด (เทสต์เดิมที่อ่าน `categoryTotals`/`professorWeight` ต้องแก้ตามรูปใหม่ — บันทึกใน ledger)

### Task 2: การ์ดทักษะ (StudentDashboard + PersonalDashboard)

**Files:**
- Modify: `src/pages/dashboards/StudentDashboard.tsx` (types ~108–135, ค่าตั้งต้น ~155–172, `deriveTechnicalScores`/`deriveSoftScores` ~197–222, การอ่าน stats ~322–358, แท็บ skills ~745–785)
- Modify: `src/components/dashboard/TechnicalSkillsRubricCard.tsx`, `SoftSkillsRubricCard.tsx`, `SkillsRadarCard.tsx`
- Modify: `src/pages/PersonalDashboard.tsx` (~400–425 การ map soft skill, ~770 `SoftSkillsCard`), `src/components/dashboard/SoftSkillsCard.tsx`
- Create: `src/lib/skill-summary.ts` + `src/lib/skill-summary.test.ts` (แปลง stats → `{ rubric | null, selfAssessed }` ใช้ร่วมสองหน้า)

- [ ] **Step 1: unit test แดง** `src/lib/skill-summary.test.ts`: `parseSkillSummary(stats)` — rubric null เมื่อ API ส่ง null · มิติ null คงเป็น null · selfAssessed อ่านถูก · ข้อมูลพัง → `{ technical: { rubric: null, selfAssessed: { average: null, count: 0 } }, soft: {...} }`
- [ ] **Step 2:** เขียน `parseSkillSummary` → เขียว
- [ ] **Step 3: E2E แดง** เพิ่มใน `e2e/no-demo-data.spec.ts` (หรือไฟล์ใหม่ `e2e/honest-numbers.spec.ts`): นักศึกษาที่ไม่มี rubric (สร้างผ่าน API เหมือน E2E อื่น หรือใช้ chompoo ถ้า seed ไม่มี rubric ของ chompoo — ตรวจ seed ก่อน) เปิด dashboard แท็บ skills → เห็น `data-testid=no-rubric` และไม่มีข้อความ "60%" / "เพื่อน" / "Peer" · เห็น `data-testid=self-assessed` พร้อมจำนวนทักษะ
- [ ] **Step 4: แก้**
  - StudentDashboard: ลบ `deriveTechnicalScores`/`deriveSoftScores` และค่าตั้งต้นที่เป็นตัวเลข · state = ผลของ `parseSkillSummary`
  - TechnicalSkillsRubricCard / SoftSkillsRubricCard รับ `rubric: {...} | null` + `selfAssessed` · rubric null → กล่อง `data-testid=no-rubric` "ยังไม่มีการประเมินจากอาจารย์" · มิติ null → "-" · ตัดส่วนน้ำหนัก 60/40, คะแนนเพื่อน, comment tags, จำนวนคอมเมนต์ · หัวการ์ดบอกที่มา "คะแนนจากอาจารย์ (N รายการ)" · แสดง `data-testid=self-assessed` "ประเมินตัวเอง: เฉลี่ย X / 5 จาก N ทักษะ" (average null → "ยังไม่ได้เพิ่มทักษะ")
  - SkillsRadarCard: วาดเฉพาะเมื่อมี rubric อย่างน้อยหนึ่งฝั่งและมิติไม่เป็น null · ไม่งั้นข้อความว่าง
  - PersonalDashboard + SoftSkillsCard: ตัด leadership/discipline/responsibility (ไม่มีแหล่งข้อมูล) · แสดงเฉพาะ communication/openness จาก soft rubric (คะแนนอาจารย์) หรือ "ยังไม่มีการประเมิน" · รายการ "Peer Feedback" เปลี่ยนเป็น "การประเมินจากอาจารย์" จาก `assessments` · ตัด `teamSize` ที่มาจาก `comments` · ซับไตเติล "จาก Peer Feedback" เปลี่ยนตามที่มาจริง
- [ ] **Step 5:** E2E เขียว · `npx vitest run src/lib` · build

### Task 3: การ์ดความก้าวหน้าหลักสูตร — ไม่แบ่งหมวด

**Files:**
- Modify: `src/components/dashboard/CreditMatrixCard.tsx`, `src/pages/dashboards/StudentDashboard.tsx` (~360–370, ~700–706)
- Create: `src/lib/credit-progress.ts` + `.test.ts`

- [ ] **Step 1: unit test แดง** `creditProgress({ requiredCredits: 120, completedCredits: 6, inProgressCredits: 3 })` → `{ completed: 6, inProgress: 3, remaining: 111, percent: 5 }` · requiredCredits 0/null → `remaining: null, percent: null` · เกินยอด → remaining 0
- [ ] **Step 2:** เขียนฟังก์ชัน → เขียว
- [ ] **Step 3: แก้การ์ด**
  - props ใหม่: `courses`, `requiredCredits`, `completedCredits`, `inProgressCredits`, `gpax` · ลบ `CATEGORY_TOTALS`, `CATEGORY_CONFIG`, การ์ดต่อหมวด, `categoryTotals`
  - สถิติ 4 ช่อง: ผ่านแล้ว / กำลังเรียน / คงเหลือ (ของ `requiredCredits`) / % — ทุกช่องมีหน่วย "หน่วยกิต" และบรรทัดที่มา "จากหลักสูตร {requiredCredits} หน่วยกิต" · null → "-"
  - Sheet: แสดงวิชาที่ลงตามปี/เทอม (ไม่มีตัวกรองหมวด, ตัดแท็บ "ยังไม่ได้เรียน" และ checkbox "วางแผน" ที่ไม่บันทึก)
  - ป้าย GPAX "Distinction/Excellent/Good" = ตัด (เกณฑ์แต่งขึ้น; Good ขึ้นแม้ GPAX 0)
- [ ] **Step 4:** E2E ใน `e2e/honest-numbers.spec.ts`: แท็บ schedule ของนักศึกษาเห็น `data-testid=credits-required` = requiredCredits จาก API และไม่มีข้อความ "GE คณะ"/"ตัวฟรี" · build

### Task 4: Portfolio — เอาการ์ด 95% ออก, แถบทักษะเป็นระดับ

**Files:**
- Modify: `src/pages/Portfolio.tsx` (~159–170 `skillLevelPercent`, ~600–612 การ์ด completeness)

- [ ] **Step 1: E2E แดง** ใน `e2e/honest-numbers.spec.ts`: นักศึกษาเปิด `/portfolio` → ไม่มีข้อความ "95%" · ทักษะแสดงป้ายระดับ (`data-testid=skill-level` เป็นหนึ่งใน beginner/intermediate/advanced/expert หรือคำไทย) ไม่มี `%`
- [ ] **Step 2: แก้** ลบการ์ด completeness (ปรับ grid ไม่ให้มีช่องว่าง) · แทนแถบ % ด้วยขั้นระดับ 4 ขั้น (ขั้นที่ถึงระบายสี) + ป้ายระดับ
- [ ] **Step 3:** E2E เขียว · build

### Task 5: อาจารย์/staff — Workload จริง, ไม่มีป้าย "เกิน", GPA เฉลี่ยตัดคนยังไม่มีเกรด

**Files:**
- Modify: `backend/src/controllers/operations.controller.ts` (`getWorkload` include `lecturer: { include: { user: true, _count: { select: { advisees: true } } } }`)
- Modify: `src/pages/Workload.tsx`, `src/pages/WorkloadTracking.tsx`, `src/pages/dashboards/StaffDashboard.tsx` (~615–625, ~801), `src/pages/Reports.tsx` (~106)
- Create: `src/lib/gpa-average.ts` + `.test.ts`
- Modify: `backend/tests/` เทสต์ workload ที่มีอยู่ (หรือสร้าง `backend/tests/workload-advisees.test.ts`)

- [ ] **Step 1: เทสต์แดง**
  - backend: `GET /api/workload` (staff) แต่ละแถวมี `lecturer._count.advisees` เท่ากับจำนวน StudentProfile ที่ `advisorId` = อาจารย์คนนั้น
  - unit: `gpaAverage([{gpax: 3}, {gpax: 0}, {gpax: 2}])` → `{ average: 2.5, count: 2 }` · ทุกคน 0 → `{ average: null, count: 0 }`
- [ ] **Step 2: แก้**
  - Workload.tsx: เทอมจาก workload record ล่าสุด (`semester/academicYear`) ไม่มี record → "-" (ลบ "1/2568" ทั้ง 2 จุด) · ตารางสอนอ่าน `asArray(section.schedule)` ทุกช่อง (ช่องที่ไม่มี day/startTime ข้าม ไม่เติม 09:00/วันหมุน) · "ที่ปรึกษา" = `lecturer.advisees.length` จาก `/courses/lecturer/schedule` หน่วย "คน" · ชั่วโมงที่ปรึกษาแสดงแยกหน่วย "ชม./สัปดาห์" · ตัด `targetProgress` (เป้า 15 ตายตัว) · ไม่มี record → ตัวเลขชั่วโมงเป็น "-"
  - WorkloadTracking.tsx: ตัด `ADV-n` → แสดงจำนวนที่ปรึกษาจริงจาก `_count.advisees` · ตัดตัวนับ/ป้าย "เกิน" (`> 15`) · แสดงชั่วโมงแยก สอน/วิจัย/ที่ปรึกษา/บริการ
  - StaffDashboard: ตัด `overloadedWorkloads` และข้อความที่ใช้มัน · GPA เฉลี่ยใช้ `gpaAverage` บน GPAX และข้อความ "GPAX เฉลี่ย X (จาก N คนที่มีเกรด)" · null → "-"
  - Reports.tsx: `avgGPA` ใช้ `gpaAverage` + บอกจำนวนคน
- [ ] **Step 3:** เทสต์ backend + unit เขียว · E2E ใน `e2e/honest-numbers.spec.ts`: narin เปิด `/workload` ไม่มีข้อความ "1/2568" · staff เปิด `/workload-tracking` ไม่มี "ADV-" และไม่มีคำว่า "เกิน"/"Overloaded" · build

### Task 6: Landing + Privacy — ตัดของที่ไม่มีแหล่ง

**Files:**
- Modify: `src/pages/LandingPage.tsx` (~275–330 แถบตัวเลข + แถบชื่อบริษัท), `src/pages/PrivacyPolicy.tsx` (~165–172 ป้าย + ข้อความ AES), ไฟล์ i18n ถ้ามีคีย์ `encryptedAES` ที่ไม่ใช้แล้ว

- [ ] **Step 1: E2E แดง** ใน `e2e/honest-numbers.spec.ts` (ไม่ login): `/` ไม่มี "5,000+", "200+", "98%", "4.9/5", "AXONS" · `/privacy` (ตรวจ path จริงใน App.tsx) ไม่มี "ISO 27001", "PDPA Compliant", "AES"
- [ ] **Step 2: แก้** ลบ section ตัวเลขและแถบชื่อบริษัททั้งก้อน (รวมหัวข้อ "ตัวเลขที่สะท้อนความจริง") · ลบป้ายรับรองและข้อความเข้ารหัส · ลบ import/คีย์ที่ไม่ใช้
- [ ] **Step 3:** E2E เขียว · Playwright ทั้งชุด · build · backend `npm test`

---

## Self-Review

- ครบ M1: 95% (T4) · แถบทักษะ (T4) · อาจารย์/เพื่อน (T1, T2) · stats แต่งเลข (T1) · workload (T5) · ชั่วโมงรวม = วิชา×3 (แก้แล้วใน F3a) · GPA เฉลี่ยรวม 0 (T5) · landing/compliance (T6) · ตัวเลขหน้ากิจกรรม (แก้แล้วใน F6)
- นอกขอบเขต: หน้ากรอก rubric · ฟิลด์หมวดวิชา · เกณฑ์ภาระงานจากคณะ · หน้า Login 5,000+ (ไม่มีแล้ว)
