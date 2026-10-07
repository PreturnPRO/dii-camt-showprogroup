# Audit M2: ปุ่มที่กดได้ต้องทำงานจริง Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทุกปุ่ม/สวิตช์/ช่องกรอกที่ M2 ชี้ว่า "กดได้แต่ไม่ทำอะไร" หรือ "ขึ้นสำเร็จทั้งที่ล้ม" ต้องทำงานจริงหรือถูกเอาออก · UI ห้ามบอกว่าสำเร็จเมื่อ API ล้ม

**Architecture:** frontend ล้วน ไม่แตะ backend ไม่มี migration · "จดจำฉัน" = เลือกที่เก็บ token (localStorage / sessionStorage) ผ่านตัวเก็บ token ที่ทดสอบได้ · bulk action ใช้ `Promise.allSettled` แล้วอัปเดต state เฉพาะรายการที่สำเร็จ · mark read อัปเดต UI หลัง API สำเร็จเท่านั้น · ของที่ไม่มีระบบรองรับ = ลบ

**Tech Stack:** React 18, Vitest (node env — ไม่มี jsdom), Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` M2 · `6-frontend-admin-company-shell.md` · `4-frontend-student.md` · **การตัดสินของ Por 7/10/69:**
- Login: **เอาปุ่ม Google/Microsoft ออก** (รวมเส้นคั่น "หรือดำเนินการต่อด้วย") · **"จดจำฉัน" ทำจริง** — ไม่ติ๊ก → token อยู่ใน sessionStorage (ปิดเบราว์เซอร์แล้วหลุด) · ติ๊ก → localStorage (เหมือนเดิม) · อายุ JWT ฝั่ง server คงเดิม (7d)
- ช่องค้นหา Header + ป้าย ⌘K = **เอาออก**
- Settings แท็บ "การแจ้งเตือน" (สวิตช์ 3 ตัว + สรุปรายสัปดาห์) = **เอาออกทั้งแท็บ** (backend ไม่มีที่อ่าน DataConsent.*Notifications และไม่มีระบบส่งอีเมล/SMS)
- AdminDashboard ปุ่ม Backup + แถว badge "Backup: Manual" = **เอาออก** · Workload ปุ่ม "ดาวน์โหลด TOR" = **เอาออก**
- แก้ได้โดยไม่ต้องถาม: bulk shortlist/reject รายงานผลจริง · mark read/อ่านทั้งหมด (หน้า Notifications + กระดิ่ง Header) ล้มแล้วแจ้ง + ไม่เปลี่ยน UI · โหลดรายการแจ้งเตือนล้มแล้วแสดงข้อผิดพลาด ไม่ใช่ "ไม่มีแจ้งเตือน" · ลบ handler ปลอม `handleSave`/`handlePasswordChange` ใน Settings · ปุ่ม "Active" ใน Account Security เปลี่ยนเป็นป้ายที่กดไม่ได้
- ตัดออกจาก M2 (ตรวจแล้ว): StudentDashboard ปุ่ม viewCalendar ทำงานแล้ว (`navigate("/activities")`) · JobPostings "แจ้งผู้สมัคร" ถูกลบไปแล้ว · CompanyOnboardingDialog mount แล้ว · Messages markRead ตอนเปิดบทสนทนาเป็นการอ่านโดยนัย ไม่ใช่ปุ่ม (นอกขอบเขต — บันทึกใน ledger)

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก `42e8812`) · **ห้าม commit/push ระหว่างรัน**
- ไม่แตะ backend · ไม่มี migration
- ข้อความไทยใหม่ห้าม `tracking-*` · ข้อความผลลัพธ์บอกจำนวนชัดเจน ("สำเร็จ 2 จาก 3 รายการ")
- ลบ import/คำแปลที่ไม่มีคนใช้หลังลบ UI (grep ทั้ง `th.ts`/`en.ts` ก่อนลบคีย์ — ลบเฉพาะคีย์ที่ไม่มีที่อื่นใช้)
- E2E ใช้ dev DB · รีสตาร์ต backend dev ก่อน E2E · แท็บ/dialog ที่มี animation ให้เช็คเชิงบวกก่อน `toHaveCount(0)`

**Seed:** นักศึกษา `alice@student.showpro.local` · บริษัท (ดู `backend/prisma/seed.ts` — ใช้บัญชีบริษัทที่ E2E `company-jobs.spec.ts` ใช้) · admin (ดู seed) · อาจารย์ narin · รหัส `Password123!`

## Review Focus

1. ไม่ติ๊ก "จดจำฉัน" → token อยู่ใน sessionStorage เท่านั้น ไม่มีใน localStorage · ติ๊ก → กลับกัน · logout ล้างทั้งสองที่ · รีเฟรชหน้าแล้วยังล็อกอินอยู่ทั้งสองแบบ · Socket ใช้ token ที่ถูกที่ (Task 1)
2. bulk shortlist/reject ที่ล้มบางรายการ → รายการที่ล้มคงสถานะเดิมและยังถูกเลือกอยู่ · ข้อความบอกจำนวนสำเร็จ/ล้ม · ล้มทั้งหมด → ไม่มี toast สำเร็จ (Task 3)
3. mark read ล้ม → จุด "ยังไม่อ่าน" ยังอยู่ทั้งในหน้า Notifications และกระดิ่ง Header · ไม่ยิง event `showpro:notification-read*` (Task 4)
4. ไม่มีปุ่ม/สวิตช์ที่ลบไปหลงเหลือที่ไหน (grep `Google`, `Microsoft`, `⌘K`, `weeklySummary`, `downloadTOR`, `backup`) (Task 2, 5)

---

### Task 1: "จดจำฉัน" ทำงานจริง

**Files:**
- Create: `src/lib/token-store.ts` + `src/lib/token-store.test.ts`
- Modify: `src/lib/api.ts` (~99–107 `getStoredToken`/`setStoredToken`/`clearStoredToken` ให้เรียกผ่าน token-store ด้วย `window.localStorage`/`window.sessionStorage`)
- Modify: `src/contexts/AuthContext.tsx` (`login(email, password, role?, remember = true)` ~101 ส่งต่อ `setStoredToken(token, remember)` · `register` คง remember=true)
- Modify: `src/pages/LoginPage.tsx` (~167 Checkbox มี state `remember` เริ่มต้น `false`, ส่งเข้า `login`)
- Modify: `e2e/auth-hardening.spec.ts` (หรือไฟล์ใหม่ `e2e/remember-me.spec.ts`)

- [ ] **Step 1: unit test แดง** `token-store.test.ts` ด้วย fake Storage (Map) สองตัว:
  - `set(token, false)` → session มี token, local ไม่มี (และถ้า local มี token เก่าค้าง ต้องถูกลบ)
  - `set(token, true)` → local มี, session ไม่มี (ลบของเก่าใน session)
  - `get()` อ่าน session ก่อน แล้ว local · ไม่มีทั้งคู่ → `null`
  - `clear()` ลบทั้งสองที่
  - storage โยน error (เช่น private mode) → `get` คืน `null`, `set`/`clear` ไม่โยนต่อ
  - รัน `npx vitest run src/lib/token-store.test.ts` → แดง
- [ ] **Step 2:** เขียน `createTokenStore(local, session, key)` → เขียว
- [ ] **Step 3: E2E แดง**
  - ล็อกอิน alice **ไม่ติ๊ก** → `page.evaluate` เช็ค `sessionStorage` มี token key, `localStorage` ไม่มี · `page.reload()` → ยังอยู่หน้า dashboard
  - เปิด page ใหม่ใน context เดียวกัน (จำลองแท็บใหม่ — sessionStorage ไม่ข้ามแท็บ) → ถูกส่งไปหน้า login
  - ล็อกอิน **ติ๊ก** → `localStorage` มี, `sessionStorage` ไม่มี · แท็บใหม่ยังล็อกอินอยู่
  - logout → ทั้งสองที่ไม่มี token
- [ ] **Step 4:** แก้ api.ts / AuthContext / LoginPage ตามข้างบน · `SocketContext` ใช้ `getStoredToken()` อยู่แล้ว ไม่ต้องแก้ แต่ต้องยืนยันใน E2E ว่าไม่มี error socket auth ใน console หลังล็อกอินแบบไม่ติ๊ก
- [ ] **Step 5:** E2E เขียว · `npx vitest run src/lib` · `npm run build`

### Task 2: ลบปุ่มที่ไม่มีระบบรองรับ (Login social, ค้นหา Header, Backup, TOR)

**Files:**
- Modify: `src/pages/LoginPage.tsx` (~183–203 เส้นคั่น `orContinueWith` + grid ปุ่ม Google/Microsoft — คงลิงก์ "ยังไม่มีบัญชี? สมัคร")
- Modify: `src/components/layout/Header.tsx` (~178–191 บล็อก search + kbd ⌘K · ลบ import `Search` ถ้าไม่มีใครใช้)
- Modify: `src/pages/dashboards/AdminDashboard.tsx` (~95 ปุ่ม Backup, ~103 แถว Backup/Manual · ลบ import `Database`/`toast` ถ้าไม่ใช้แล้ว)
- Modify: `src/pages/Workload.tsx` (~260–265 ปุ่ม downloadTOR · ลบ import `Download` ถ้าไม่ใช้)
- Modify: `src/i18n/translations/th.ts`, `en.ts` (ลบคีย์ `orContinueWith`, `backup`, `downloadTOR` เฉพาะถ้าไม่มีที่อื่นใช้)
- Modify: `e2e/role-pages.spec.ts` (หรือ `no-demo-data.spec.ts`)

- [ ] **Step 1: E2E แดง**
  - `/login`: `getByRole('button', { name: 'Google' })` และ `'Microsoft'` count 0 (เช็คเชิงบวกก่อน: ปุ่มเข้าสู่ระบบมองเห็น)
  - หลังล็อกอิน (ใดๆ) ที่ viewport ≥1024px: ไม่มี `input[placeholder="ค้นหา..."]`/`"Search..."` และไม่มีข้อความ `⌘K` (เช็คเชิงบวกก่อน: หัวข้อหน้าใน Header มองเห็น)
  - admin dashboard: การ์ด "สถานะระบบ" มองเห็น แถว Database มี → ไม่มีข้อความ `Backup` ทั้งหน้า และไม่มีปุ่ม `t.adminDashboard.backup`
  - อาจารย์ narin หน้า `/workload`: หัวข้อหน้ามองเห็น → ไม่มีปุ่มข้อความ downloadTOR (ไทย/อังกฤษ)
- [ ] **Step 2:** ลบตามรายการ Files
- [ ] **Step 3:** E2E เขียว · grep ยืนยันไม่มีคีย์/ข้อความหลงเหลือ · `npm run build` (tsc จับ import ค้าง) · `npm run lint` ไม่มี error ใหม่

### Task 3: bulk shortlist/reject รายงานผลจริง

**Files:**
- Create: `src/lib/bulk-result.ts` + `src/lib/bulk-result.test.ts`
- Modify: `src/pages/Applicants.tsx` (~252–265 `bulkShortlist`/`bulkReject`, copy th/en ~70–140)
- Create: `e2e/applicants-bulk.spec.ts`

- [ ] **Step 1: unit test แดง** `splitSettled(ids, results)` → `{ succeeded: string[], failed: string[] }` ตามลำดับ ids · ความยาวไม่เท่ากันโยน error · `bulkMessage({ succeeded, failed }, lang)` → ทั้งหมดสำเร็จ: "ปรับสถานะแล้ว N รายการ" (kind `success`) · บางส่วน: "สำเร็จ X จาก N รายการ — ไม่สำเร็จ Y รายการ" (kind `warning`) · ล้มทั้งหมด: "ปรับสถานะไม่สำเร็จ" (kind `error`)
- [ ] **Step 2:** เขียน → เขียว
- [ ] **Step 3: E2E แดง** (บัญชีบริษัทที่มีผู้สมัครอย่างน้อย 2 คน — สร้างใบสมัครผ่าน API ใน `beforeAll` ถ้า seed ไม่พอ):
  - `page.route('**/api/applications/<idB>', route => route.request().method() === 'PATCH' ? route.fulfill({ status: 500, body: '{"message":"fail"}' }) : route.continue())`
  - เลือก A และ B → shortlist → A แสดงสถานะ shortlisted · B สถานะเดิม · B checkbox ยังติ๊ก, A ไม่ติ๊ก · toast มีข้อความ "สำเร็จ 1 จาก 2"
  - route ล้มทุกรายการ → ไม่มี toast สำเร็จ, มี toast error, สถานะไม่เปลี่ยน
  - (ตรวจ method/path จริงของ `api.applications.update` ใน `src/lib/api.ts` ก่อนเขียน route)
- [ ] **Step 4: แก้** `Promise.allSettled` → `splitSettled` → `setApplicants` เปลี่ยนเฉพาะ `succeeded` → `setSelectedIds(new Set(failed))` → toast ตาม kind ของ `bulkMessage` · ใช้ฟังก์ชันเดียวร่วม `runBulk(status)` ทั้ง shortlist/reject (reject คง `confirm` ไว้)
- [ ] **Step 5:** E2E + unit เขียว

### Task 4: mark read / โหลดแจ้งเตือน ล้มต้องรู้

**Files:**
- Modify: `src/pages/Notifications.tsx` (~74–83 load, ~99–119 `handleMarkRead`/`handleMarkAllRead`, ~121 `handleOpenNotification`)
- Modify: `src/components/layout/Header.tsx` (~120–142 `handleNotificationClick`/`handleMarkAllNotifications`)
- Create: `e2e/notifications-errors.spec.ts`

- [ ] **Step 1: E2E แดง** (alice — สร้างแจ้งเตือนที่ยังไม่อ่านอย่างน้อย 1 รายการผ่าน API/prisma ใน setup ถ้า seed ไม่มี · ตรวจ path จริงของ markRead/markAllRead ใน `api.ts` ~241–246):
  - route `PATCH` markRead → 500 · หน้า `/notifications` คลิกรายการที่ยังไม่อ่าน → ยังมีเครื่องหมายยังไม่อ่าน (ใส่ `data-testid=unread-dot` ถ้ายังไม่มี) · มี toast error · ถ้ารายการมี actionUrl ยังนำทางได้
  - route markAllRead → 500 · กด "อ่านทั้งหมด" → ตัวนับกระดิ่ง Header ไม่เปลี่ยน · มี toast error
  - กระดิ่ง Header: route markRead → 500 · คลิกรายการในดรอปดาวน์ → ตัวนับไม่ลด · มี toast error
  - route `GET` list → 500 · หน้า `/notifications` แสดง `data-testid=notifications-load-error` ไม่ใช่ข้อความ "ไม่มีการแจ้งเตือน"
- [ ] **Step 2: แก้**
  - ทั้ง 4 handler: เรียก API ก่อน → สำเร็จจึง `setNotifications` + `dispatchEvent` · ล้ม → `toast.error` (ข้อความ th/en "ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จ") และไม่เปลี่ยน state
  - `handleOpenNotification`: นำทางต่อแม้ mark read ล้ม (การอ่านเนื้อหาไม่ควรถูกบล็อก)
  - load: state `loadError` → แสดงกล่องข้อผิดพลาด + ปุ่ม "ลองใหม่" ที่เรียกโหลดซ้ำ
- [ ] **Step 3:** E2E เขียว

### Task 5: Settings — ลบแท็บแจ้งเตือน, handler ปลอม, ปุ่ม "Active"

**Files:**
- Modify: `src/pages/Settings.tsx` (~60–84 `handleSave`/`handlePasswordChange` ที่ไม่มีคนใช้ · ~289 เมนู `notifications` · ~445–500 บล็อก `activeTab === 'notifications'` · ~550–556 ปุ่ม Active → ป้ายกดไม่ได้ `data-testid=security-active` · ลบ import `Switch`/`Bell`/`Mail` ที่ไม่ใช้)
- Modify: `th.ts`/`en.ts` (คีย์ notifications ของ settingsPage ที่ไม่มีที่อื่นใช้)
- Modify: `e2e/role-pages.spec.ts` (หรือไฟล์ Task 2)

- [ ] **Step 1: E2E แดง** `/settings` (alice): เมนู "ข้อมูลส่วนตัว" มองเห็น → ไม่มีเมนู `notificationsTitle` (ไทย/อังกฤษ) · ไม่มี `role=switch` ทั้งหน้า · แท็บความปลอดภัย: `security-active` มองเห็นและไม่ใช่ `button` (`getByRole('button', { name: 'Active' })` count 0)
- [ ] **Step 2:** แก้ตาม Files · ยืนยันว่า `?tab=notifications` (ถ้ามีการอ่าน tab จาก URL — grep) ไม่ทำให้หน้าว่าง → กลับไป `profile`
- [ ] **Step 3:** E2E เขียว · build · lint

### Task 6: ตรวจรวม

- [ ] `npx vitest run src/lib` เขียวทั้งชุด · `cd backend && npm test` (ไม่ควรกระทบ แต่ยืนยัน)
- [ ] รีสตาร์ต backend dev → `npx playwright test` ทั้งชุด — เทสต์เดิมที่พังเพราะ UI ที่ลบ (เช่นเลือกปุ่ม Google/ช่องค้นหา) ให้แก้ตามและบันทึกใน ledger
- [ ] `npm run build` + `npm run lint` (เทียบจำนวน error กับก่อนเริ่ม — ไม่เพิ่ม)
- [ ] grep หลงเหลือ: `Google|Microsoft` ใน LoginPage, `⌘K`, `weeklySummary`, `downloadTOR`, `Backup will be available`, `.catch(() => undefined)` ใน Applicants
- [ ] เขียน ledger `~/Documents/dii-audit-2026-10/m2-ledger.md` (rulings + deferred minors: Messages markRead โดยนัย, catch ว่างอื่นๆ ~30 จุดใน src/pages+components ที่ไม่อยู่ใน M2)
