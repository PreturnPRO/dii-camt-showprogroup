# Audit F8: ลิงก์แชร์ portfolio ใช้ได้จริง Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** นักศึกษาเปิด Public Mode แล้วคนที่มีลิงก์ `/portfolio/<รหัสนักศึกษา>` เปิดดูได้จริง (รวมคนที่ยังไม่ login) · ปิดแล้วเปิดไม่ได้ · สวิตช์บอกสถานะตามจริง · หน้าสาธารณะไม่เห็นข้อมูลเกิน

**Architecture:** backend เดิมเปิดให้คนนอกดูเมื่อ `portfolio.isPublic && consent.allowPortfolioSharing` (S-b1 ใส่ `optionalAuth` แล้ว ส่วนที่รายงาน F8 ชี้ไว้แก้แล้ว) แต่ไม่มีหน้าไหนตั้ง `allowPortfolioSharing` → ลิงก์ได้ 403 เสมอ · แก้ที่สวิตช์ Public Mode ให้ส่งทั้งสองค่าพร้อมกัน · backend เพิ่มเฉพาะการกรองฟิลด์หน้าสาธารณะ · consent ยังเป็นตัวตัดสินจริง (ไม่ derive จาก `isPublic` เพราะ `isPublic` ค่าตั้งต้นเป็น `true` และการแก้โปรเจกต์ส่ง `isPublic ?? true` ไปด้วยทุกครั้ง — ถ้าให้ `isPublic` ให้ consent ด้วย การแก้โปรเจกต์จะกลายเป็นยินยอมเปิดสาธารณะโดยไม่รู้ตัว)

**Tech Stack:** Express + Prisma, Vitest + supertest, React 18, Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` F8 · ตรวจจริง 7/10/69: chompoo (65010003) เจ้าของ GET `/students/profile/65010003` = 200, ไม่ login = 403, `consent.allowPortfolioSharing=false`, ไม่มีแถว portfolio แต่สวิตช์ขึ้น "Public Mode" · **การตัดสินของ Por 7/10/69:**
- สวิตช์เดียว: เปิด Public Mode = ตั้ง `portfolio.isPublic` และ `consent.allowPortfolioSharing` เป็น true พร้อมกัน · ปิด = false ทั้งคู่ · มีข้อความบอกว่าทุกคนที่มีลิงก์ดูได้ · ปุ่มแชร์กดได้เฉพาะตอน public
- ลิงก์ใช้รหัสนักศึกษาเหมือนเดิม (ไม่ทำ token)

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `b4f9385`) · **ห้าม commit/push ระหว่างรัน** — Por อนุมัติตอนจบ
- ไม่มี migration
- ข้อความไทยห้าม letter-spacing (ห้ามใส่ `tracking-*` บนข้อความไทยใหม่)
- E2E ใช้ dev DB · E2E ที่เปิด public ต้องคืนค่าเดิม (private) ใน `finally`
- รีสตาร์ต backend dev ก่อน E2E (tsx watch ไม่โหลดโค้ดใหม่)

**Seed:** นักศึกษา `chompoo@student.showpro.local` รหัส 65010003 · รหัส `Password123!` · `PATCH /api/students/profile` (นักศึกษาแก้ของตัวเอง, รับ `portfolio` และ `consent`)

## Review Focus

1. คนไม่ login เปิดลิงก์ของคนที่เปิด Public Mode ได้ · ของคนที่ปิดได้ 403 / หน้า "private" (Task 1, Task 2)
2. แก้โปรเจกต์/summary อย่างเดียวต้องไม่ทำให้ `allowPortfolioSharing` เปลี่ยน (Task 2)
3. นักศึกษาที่ไม่มีแถว portfolio หรือ `isPublic=true` แต่ consent false → สวิตช์ขึ้น Private (Task 2)
4. หน้าสาธารณะไม่มี `sharedWith` (Task 1)

---

### Task 1: backend — หน้าสาธารณะส่งเฉพาะฟิลด์ที่ควรเห็น

**Files:**
- Modify: `backend/src/controllers/students.controller.ts` (`getStudentProfileByIdHandler` ส่วน public)
- Create: `backend/tests/portfolio-share.test.ts`

- [ ] **Step 1: เทสต์แดง** — `backend/tests/portfolio-share.test.ts`:
  - สร้างนักศึกษาใหม่ (ตาม pattern `freshStudentIn` ใน `class-moves-api.test.ts`) · login เป็นนักศึกษานั้น · `PATCH /api/students/profile` ส่ง `{ portfolio: { summary: "s", isPublic: true, sharedWith: ["company-x"], projects: [] }, consent: { allowPortfolioSharing: true } }`
  - `GET /api/students/profile/<studentId>` ไม่มี Authorization → 200, `profile.name` ตรง, `profile.portfolio.sharedWith` เป็น `undefined`, ไม่มี `profile.consent`, ไม่มี `profile.gpa`
  - `PATCH` ส่ง `{ portfolio: {..., isPublic: false }, consent: { allowPortfolioSharing: false } }` → GET ไม่ login = 403
  - `PATCH` ส่งแค่ `{ portfolio: { summary: "edit", isPublic: true, projects: [] } }` (ไม่มี consent) หลังปิดแล้ว → GET ไม่ login ยัง 403 (การแก้ portfolio ไม่ให้ consent)
  - รัน `cd backend && npx vitest run tests/portfolio-share.test.ts` → คาดว่าแดงที่ `sharedWith`
- [ ] **Step 2: แก้** — ส่วน public ของ handler เปลี่ยน `portfolio: student.portfolio` เป็นเลือกฟิลด์: `summary, summaryThai, githubUrl, linkedinUrl, personalWebsite, projects, isPublic` (ไม่รวม `sharedWith`, `studentId`, `id`) · `null` ถ้าไม่มี portfolio
- [ ] **Step 3:** รันไฟล์เทสต์ → เขียว · `npm test` ทั้งชุด → เขียว

### Task 2: frontend — สวิตช์เดียวที่บอกตามจริง + ปุ่มแชร์ที่ไม่โกหก

**Files:**
- Modify: `src/pages/Portfolio.tsx` (สวิตช์ ~บรรทัด 525–535, `handlePublicToggle` ~260, ปุ่มแชร์ ~537–547)
- Modify: `src/lib/live-mappers.ts` เฉพาะถ้าต้องให้ `portfolio.isPublic` ของคนที่ไม่มีแถว portfolio เป็น false (ดู Step 2)
- Create: `e2e/portfolio-share.spec.ts`

- [ ] **Step 1: E2E แดง** — `e2e/portfolio-share.spec.ts`:
  - login chompoo → `/portfolio` · สวิตช์ `#portfolio-public-mode` ต้องเป็น `aria-checked="false"` และปุ่มแชร์ (`data-testid=share-portfolio`) disabled (seed: consent false)
  - คลิกสวิตช์ → เห็นข้อความว่าทุกคนที่มีลิงก์ดูได้ (`data-testid=public-note`) · poll API `GET /students/profile` ว่า `portfolio.isPublic=true` และ `consent.allowPortfolioSharing=true`
  - เปิด browser context ใหม่ (ไม่ login) ไป `/portfolio/65010003` → เห็นชื่อ chompoo (ไม่ใช่ข้อความ "private")
  - กลับมาคลิกสวิตช์ปิด → context ไม่ login reload → เห็นข้อความ private
  - `finally`: `PATCH /students/profile` ด้วย token chompoo ตั้งทั้งสองค่าเป็น false
- [ ] **Step 2: แก้**
  - สถานะสวิตช์ = `student.portfolio?.isPublic === true && student.dataConsent?.allowPortfolioSharing === true` (ชื่อฟิลด์ consent ตาม `mapStudent` ใน `live-mappers.ts` ~บรรทัด 687) · label ไทย/อังกฤษตาม `language`
  - `handlePublicToggle(checked)` ส่ง `portfolio: {..., isPublic: checked}` **และ** `consent: { allowPortfolioSharing: checked }` ใน request เดียว · toast สำเร็จ/ล้มเหลวเหมือนเดิม
  - ใต้สวิตช์เมื่อ public: ข้อความ `data-testid=public-note` "ทุกคนที่มีลิงก์ดู portfolio นี้ได้ (ไม่ต้อง login)" / "Anyone with the link can view this portfolio"
  - ปุ่มแชร์ `data-testid=share-portfolio` disabled เมื่อไม่ public · `await navigator.clipboard.writeText(url)` ใน try: สำเร็จ → toast "คัดลอกลิงก์แล้ว"; ล้ม/ไม่มี clipboard → toast แสดง URL ให้คัดลอกเอง
  - ฟังก์ชันอื่นที่ส่ง `isPublic: currentPortfolio?.isPublic ?? true` (บรรทัด ~207, ~312, ~360) ไม่ต้องแตะ — consent ไม่เปลี่ยนจากการแก้เหล่านั้น (Review Focus 2 ทดสอบใน Task 1)
- [ ] **Step 3:** รัน E2E ไฟล์นี้ → เขียว · Playwright ทั้งชุด · `npx vitest run src/lib` · `npm run build`

---

## Self-Review

- Spec coverage: ลิงก์ใช้ได้ (T1 test + T2 E2E) · สวิตช์เดียว (T2) · ปุ่มแชร์เฉพาะ public (T2) · ข้อมูลเกิน (T1) · ลิงก์ใช้รหัสนักศึกษา (ไม่แตะ URL)
- นอกขอบเขต: token ลิงก์ (Por ตัดสินไม่ทำ) · หน้า Settings เรื่อง consent อื่น (`allowDataSharing` ฯลฯ) · `isPublic` ค่าตั้งต้น `true` ใน schema (ไม่เปลี่ยน เพราะ consent เป็นตัวตัดสิน)
