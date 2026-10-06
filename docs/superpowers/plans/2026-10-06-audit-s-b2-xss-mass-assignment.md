# Audit S-b2: ปิดลิงก์อันตราย (S5) และการแก้ข้อมูลเกินสิทธิ์ (S6 บางส่วน) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ลิงก์ที่ผู้ใช้กรอก (CV, GitHub, LinkedIn, เว็บ, ลิงก์โปรเจกต์, resume, เอกสาร, ไฟล์แนบ, เว็บบริษัท, ลิงก์ในแจ้งเตือน) รันโค้ดในเครื่องคนกดไม่ได้อีก · นักศึกษาแก้ข้อมูลการศึกษาของตัวเอง ยืนยันทักษะตัวเอง หรือแก้หมวดทักษะของทั้งระบบไม่ได้ · บริษัทตั้งสถานะ onboarding เองไม่ได้ · admin แก้ข้อมูลนักศึกษาแล้วรหัสนักศึกษาไม่เพี้ยน

**Architecture:** backend มีตัวตรวจลิงก์ที่เดียว `backend/src/schemas/url.ts` (zod `httpUrl` / `optionalHttpUrl` / `internalPath` + `assertHttpUrls` สำหรับ input แบบ record) ใช้กับทุก schema และ controller ที่รับลิงก์ · frontend มีตัวกรองที่เดียว `src/lib/safe-url.ts` ใช้ทุกจุดที่เปิดลิงก์จากข้อมูล (กันข้อมูลเก่าที่บันทึกไว้แล้วด้วย) · การแก้โปรไฟล์ใช้ whitelist ตาม role ใน controller

**Tech Stack:** Express 4, Prisma 6, Zod 3, Vitest + supertest, React 18 + Vite, Vitest (frontend unit), Playwright

**Spec:** `~/Documents/dii-audit-2026-10/SUMMARY.html` กลุ่ม S5 และ S6 · รายละเอียด `2-backend-academic.md` (CRITICAL mass assignment, MEDIUM skill/URL abuse), `3-backend-career-ops.md` (MEDIUM javascript: URIs) · การตัดสินของ Por 6/10/69: ข้อมูลการศึกษาของนักศึกษาแก้ได้เฉพาะ staff/admin · สถานะ onboarding บริษัทตั้งได้เฉพาะ staff · เช็คอินกิจกรรม/ใบรับรองฝึกงาน **ว่างไว้ก่อน (ไม่อยู่ในแผนนี้)**

## Global Constraints

- worktree `/Users/pordiewtrakul/WORK /dii-main-audit` branch `fix/audit-2026-10` (ต่อจาก S-b1 `e1679c0`) · ห้าม commit/push ระหว่างรัน — Por อนุมัติตอนจบ
- เทสต์ใช้ DB `showpro_main_test` เท่านั้น · dev ใช้ `showpro_main` · ห้ามแตะ `showpro` / `showpro_test`
- ไม่เพิ่ม migration
- ลิงก์ภายนอกที่ยอมรับ: `http:` และ `https:` เท่านั้น · ลิงก์ในแจ้งเตือน (`actionUrl`) ต้องเป็น path ภายในที่ขึ้นต้นด้วย `/` ตัวเดียว
- ช่องลิงก์ที่เดิมรับ `""` ยังต้องรับ `""` (ฟอร์มส่งค่าว่างเพื่อลบลิงก์)
- นักศึกษาแก้เองได้: `cvUrl`, `portfolio`, `consent`, `skills` (ระดับ/ประสบการณ์) · ห้ามแก้: `studentId`, `advisorId`, `academicStatus`, `year`, `major`, `program`, `semester`, `academicYear` · ค่าที่ห้ามแก้ซึ่งหน้าเว็บส่งกลับมา (echo) ให้**ข้ามเงียบ ๆ** ไม่ตอบ 400 เพราะ Settings/Portfolio ส่งค่าเดิมกลับทุกครั้ง
- ข้อความ error เป็นภาษาอังกฤษตามแบบเดิมของ backend · ข้อความไทยบนหน้าเว็บห้ามมี letter-spacing
- ไม่อยู่ในแผนนี้ (Por สั่งว่างไว้): เช็คอินกิจกรรม/ปั๊มแต้ม/รางวัลซ้ำ, ใบรับรองฝึกงานจากชั่วโมงที่กรอกเอง

**Seed ที่เทสต์อ้างอิง:** alice `65010001` (advisor narin) · bob `65010002` · admin `admin@showpro.local` · staff `staff@showpro.local` · company `talent@northernsoft.local` · lecturer mali `mali@showpro.local` · รหัสผ่าน `Password123!` · helper `loginAs(email)` ใน `backend/tests/helpers/auth.ts`

## Review Focus

1. ลิงก์ที่มีช่องว่างนำหน้าหรือตัวพิมพ์ใหญ่ (`"  JavaScript:alert(1)"`) และ `data:` / `vbscript:` ต้องถูกปฏิเสธ (Task 1 unit test)
2. ข้อมูลลิงก์อันตรายที่บันทึกไว้ก่อนแก้ (อยู่ใน DB แล้ว) ต้องไม่ถูกเปิดจากหน้าเว็บ (Task 4 E2E แบบ mock response)
3. นักศึกษาบันทึกรายการทักษะซ้ำ (หน้า Portfolio ส่งทักษะทั้งหมดกลับ) ทักษะที่อาจารย์/staff ยืนยันไว้แล้วต้องยังยืนยันอยู่ (Task 3)
4. หน้า Settings/Portfolio ของนักศึกษาที่ส่งค่าการศึกษาเดิมกลับมา ต้องบันทึกสำเร็จ (200) และค่าไม่เปลี่ยน (Task 2)
5. หน้าต้อนรับบริษัทที่ส่ง `onboardingStatus: "completed"` ต้องบันทึกสำเร็จ (200) แต่สถานะไม่เปลี่ยน (Task 2)

---

### Task 1: ตัวตรวจลิงก์ฝั่ง backend + ใช้กับทุก schema

**Files:**
- Create: `backend/src/schemas/url.ts`
- Modify: `backend/src/schemas/students.schema.ts` (cvUrl, githubUrl, linkedinUrl, personalWebsite, projects[].url), `backend/src/schemas/career.schema.ts` (`applySchema.resumeUrl`, `internshipDocumentCreateSchema.url`), `backend/src/schemas/academic.schema.ts` (`materials[].url`), `backend/src/schemas/support.schema.ts` (`messageCreateSchema.attachments[].url`), `backend/src/schemas/system.schema.ts` (`notificationBroadcastSchema.actionUrl`, `companyImportRowSchema.website` + `.locationMapUrl`), `backend/src/controllers/auth.controller.ts` (register: `profile.cvUrl`), `backend/src/controllers/system.controller.ts` (create user: `profile.website`, `profile.locationMapUrl`)
- Test: `backend/tests/url-safety.test.ts`

**Interfaces — Produces:**
- `httpUrl: z.ZodEffects<z.ZodString>` — trim แล้วต้องเป็น URL และขึ้นต้น `http://` หรือ `https://` (ไม่สนตัวพิมพ์)
- `optionalHttpUrl` = `httpUrl.optional().or(z.literal(""))`
- `internalPath` — ขึ้นต้น `/` และตัวที่สองไม่ใช่ `/` หรือ `\`
- `isHttpUrl(value: unknown): boolean`
- `assertHttpUrls(record: Record<string, unknown>, keys: string[]): void` — ค่าที่ไม่ว่าง (`undefined`/`null`/`""` ผ่าน) ต้อง `isHttpUrl` ไม่งั้น `throw new AppError(400, \`${key} must be an http(s) URL\`)`

- [ ] **Step 1: เทสต์ที่ fail** — `backend/tests/url-safety.test.ts`

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { assertHttpUrls, httpUrl, internalPath, optionalHttpUrl } from "../src/schemas/url";
import { loginAs } from "./helpers/auth";

const bad = ["javascript:alert(1)", "  JavaScript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "ftp://x.y/z"];

describe("httpUrl", () => {
  it("accepts http and https", () => {
    expect(httpUrl.safeParse("https://github.com/alice").success).toBe(true);
    expect(httpUrl.safeParse("http://example.com").success).toBe(true);
  });
  it.each(bad)("rejects %s", (value) => {
    expect(httpUrl.safeParse(value).success).toBe(false);
  });
  it("optionalHttpUrl still accepts an empty string to clear a link", () => {
    expect(optionalHttpUrl.safeParse("").success).toBe(true);
    expect(optionalHttpUrl.safeParse(undefined).success).toBe(true);
  });
});

describe("internalPath", () => {
  it("accepts app paths", () => {
    expect(internalPath.safeParse("/appointments").success).toBe(true);
    expect(internalPath.safeParse("/requests?id=1").success).toBe(true);
  });
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "appointments"])("rejects %s", (value) => {
    expect(internalPath.safeParse(value).success).toBe(false);
  });
});

describe("assertHttpUrls", () => {
  it("lets empty values through and rejects unsafe ones with 400", () => {
    expect(() => assertHttpUrls({ website: "", locationMapUrl: undefined }, ["website", "locationMapUrl"])).not.toThrow();
    expect(() => assertHttpUrls({ website: "javascript:alert(1)" }, ["website"])).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe("endpoints refuse javascript: links", () => {
  const as = async (email: string) => `Bearer ${await loginAs(email)}`;

  it("student portfolio and CV links", async () => {
    const auth = await as("alice@student.showpro.local");
    for (const body of [{ cvUrl: "javascript:alert(1)" }, { portfolio: { githubUrl: "javascript:alert(1)" } }, { portfolio: { projects: [{ title: "x", description: "x", role: "x", startDate: "2026-01-01", url: "javascript:alert(1)" }] } }]) {
      expect((await request(app).patch("/api/students/profile").set("Authorization", auth).send(body)).status).toBe(400);
    }
    expect((await request(app).patch("/api/students/profile").set("Authorization", auth).send({ portfolio: { githubUrl: "https://github.com/alice" } })).status).toBe(200);
  });

  it("job application resume, internship document, message attachment", async () => {
    const auth = await as("alice@student.showpro.local");
    expect((await request(app).post("/api/apply/any-job").set("Authorization", auth).send({ resumeUrl: "javascript:alert(1)" })).status).toBe(400);
    expect((await request(app).post("/api/internship/documents").set("Authorization", auth).send({ type: "report", title: "x", url: "javascript:alert(1)" })).status).toBe(400);
    expect((await request(app).post("/api/messages").set("Authorization", auth).send({ toId: "x", subject: "x", body: "x", attachments: [{ name: "a", url: "javascript:alert(1)", size: "1" }] })).status).toBe(400);
  });

  it("staff notification broadcast only takes in-app paths", async () => {
    const auth = await as("staff@showpro.local");
    const send = (actionUrl: string) =>
      request(app).post("/api/notifications/broadcast").set("Authorization", auth).send({ title: "t", message: "m", targetRoles: ["STUDENT"], actionUrl });
    expect((await send("javascript:alert(1)")).status).toBe(400);
    expect((await send("https://evil.example")).status).toBe(400);
    expect((await send("/activities")).status).toBeLessThan(300);
  });

  it("staff creating a company cannot store a javascript: website", async () => {
    const auth = await as("staff@showpro.local");
    const res = await request(app).post("/api/users").set("Authorization", auth).send({
      email: `co-${Date.now()}@example.com`, name: "Co", role: "COMPANY",
      profile: { companyName: "Co", industry: "IT", size: "small", website: "javascript:alert(1)" },
    });
    expect(res.status).toBe(400);
  });
});
```
> ก่อนรัน: ตรวจ field บังคับของ `userCreateSchema` สำหรับบริษัท (ถ้าต้องมี `phone` หรือ `nameThai` ให้เติมใน body) · ตรวจว่า route `/messages` และ `/apply/:jobId` ใช้ `validate(...)` ก่อน handler จริง (ถ้า handler ถูกเรียกก่อน 400 อาจกลายเป็น 404 — ให้ใช้ id จริงจาก seed แทน)

- [ ] **Step 2: รัน → FAIL** — `cd backend && npx vitest run tests/url-safety.test.ts` · Expected: FAIL "Cannot find module '../src/schemas/url'"

- [ ] **Step 3: เขียนโมดูล** — `backend/src/schemas/url.ts`

```ts
import { z } from "zod";
import { AppError } from "../utils/errors";

const HTTP_SCHEME = /^https?:\/\//i;

export const isHttpUrl = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return HTTP_SCHEME.test(trimmed) && z.string().url().safeParse(trimmed).success;
};

export const httpUrl = z
  .string()
  .trim()
  .refine(isHttpUrl, { message: "Must be an http(s) URL" });

export const optionalHttpUrl = httpUrl.optional().or(z.literal(""));

export const internalPath = z
  .string()
  .refine((value) => value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\"), {
    message: "Must be an in-app path starting with /",
  });

export const assertHttpUrls = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") continue;
    if (!isHttpUrl(value)) throw new AppError(400, `${key} must be an http(s) URL`);
  }
};
```

- [ ] **Step 4: ใช้กับ schema/controller**
- `students.schema.ts`: `cvUrl: optionalHttpUrl` · `githubUrl`, `linkedinUrl`, `personalWebsite`, `projects[].url` → `optionalHttpUrl` (แทน `z.string().url().optional().or(z.literal(""))`)
- `career.schema.ts`: `resumeUrl: httpUrl.optional()` · `internshipDocumentCreateSchema.url: httpUrl`
- `academic.schema.ts`: `materials[].url: httpUrl`
- `support.schema.ts`: `attachments: z.array(z.object({ name: z.string(), url: httpUrl, size: z.string() })).optional()`
- `system.schema.ts`: `actionUrl: internalPath.optional()` · `companyImportRowSchema`: `website: optionalHttpUrl`, `locationMapUrl: optionalHttpUrl`
- `auth.controller.ts` register: ก่อนสร้าง studentProfile → `assertHttpUrls(profile, ["cvUrl"])`
- `system.controller.ts` create user (สาย COMPANY ที่ใช้ `profile.website`): ก่อน transaction → `assertHttpUrls(profile, ["website", "locationMapUrl"])`

- [ ] **Step 5: รัน → PASS** — `npx vitest run tests/url-safety.test.ts` · ทั้งชุด `npm test --prefix backend` PASS · `cd backend && npx tsc --noEmit` exit 0

---

### Task 2: แก้โปรไฟล์ตัวเองผ่าน `/users/profile` และ staff แก้ผู้ใช้ — whitelist ตาม role

**Files:**
- Modify: `backend/src/controllers/auth.controller.ts` (`updateProfile` สาย `switch (currentUser.role)`), `backend/src/controllers/system.controller.ts` (update user สาย COMPANY ที่ใช้ `roleData.website` ~บรรทัด 610-630)
- Test: `backend/tests/self-profile-whitelist.test.ts`

**Interfaces — Consumes:** `assertHttpUrls` (Task 1)

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const patchSelf = async (email: string, body: Record<string, unknown>) =>
  request(app).patch("/api/users/profile").set("Authorization", `Bearer ${await loginAs(email)}`).send(body);

describe("student self-update via /users/profile", () => {
  it("echoed academic fields are accepted but never change; cvUrl does", async () => {
    const before = await prisma.studentProfile.findFirstOrThrow({ where: { studentId: "65010001" } });
    const res = await patchSelf("alice@student.showpro.local", {
      name: "Alice",
      roleData: { major: "Hacked", program: "phd", year: 9, semester: 3, academicYear: "1999", cvUrl: "https://cv.example.com/alice.pdf" },
    });
    expect(res.status).toBe(200);
    const after = await prisma.studentProfile.findUniqueOrThrow({ where: { id: before.id } });
    expect({ major: after.major, program: after.program, year: after.year, semester: after.semester, academicYear: after.academicYear })
      .toEqual({ major: before.major, program: before.program, year: before.year, semester: before.semester, academicYear: before.academicYear });
    expect(after.cvUrl).toBe("https://cv.example.com/alice.pdf");
  });

  it("a javascript: cvUrl is refused", async () => {
    expect((await patchSelf("alice@student.showpro.local", { roleData: { cvUrl: "javascript:alert(1)" } })).status).toBe(400);
  });
});

describe("company self-update via /users/profile", () => {
  it("onboarding dialog save succeeds but the company cannot set its own onboarding status", async () => {
    const before = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    const res = await patchSelf("talent@northernsoft.local", { roleData: { onboardingStatus: "completed", companyName: before.companyName } });
    expect(res.status).toBe(200);
    const after = await prisma.companyProfile.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.onboardingStatus).toBe(before.onboardingStatus);
  });

  it("javascript: website or map link is refused", async () => {
    for (const roleData of [{ website: "javascript:alert(1)" }, { locationMapUrl: "javascript:alert(1)" }]) {
      expect((await patchSelf("talent@northernsoft.local", { roleData })).status).toBe(400);
    }
  });
});

describe("staff editing a company", () => {
  it("can set the onboarding status but not a javascript: website", async () => {
    const auth = `Bearer ${await loginAs("staff@showpro.local")}`;
    const company = await prisma.user.findUniqueOrThrow({ where: { email: "talent@northernsoft.local" } });
    expect((await request(app).patch(`/api/users/${company.id}`).set("Authorization", auth).send({ roleData: { website: "javascript:alert(1)" } })).status).toBe(400);
    const ok = await request(app).patch(`/api/users/${company.id}`).set("Authorization", auth).send({ roleData: { onboardingStatus: "completed" } });
    expect(ok.status).toBe(200);
    expect((await prisma.companyProfile.findUniqueOrThrow({ where: { userId: company.id } })).onboardingStatus).toBe("completed");
  });
});
```
> ก่อนรัน: ถ้า seed ของ talent มี `onboardingStatus` เป็น `"completed"` อยู่แล้ว เทสต์ข้อแรกของบริษัทจะผ่านโดยไม่ได้พิสูจน์อะไร — ให้ `beforeAll` ตั้งค่าเป็น `"pending_review"` ด้วย prisma ก่อน · ตรวจว่า staff `PATCH /users/:id` ของบริษัทต้องส่ง field อื่นอะไรบ้างเพื่อผ่าน `userUpdateSchema`

- [ ] **Step 2: รัน → FAIL** — `npx vitest run tests/self-profile-whitelist.test.ts` · Expected: ข้อ academic/onboarding/javascript fail (ค่าเปลี่ยน หรือได้ 200)

- [ ] **Step 3: แก้โค้ด** `auth.controller.ts` `updateProfile`
- ก่อน `prisma.$transaction`: ถ้า STUDENT → `assertHttpUrls(roleData, ["cvUrl"])` · ถ้า COMPANY → `assertHttpUrls(roleData, ["website", "locationMapUrl"])`
- `case Role.STUDENT`: `data: { cvUrl: roleData.cvUrl }` เท่านั้น (ลบ major/program/year/semester/academicYear) — ใส่คอมเมนต์ `// academic fields are staff/admin only (audit S6); the UI echoes them, so they are ignored, not rejected`
- `case Role.COMPANY`: ลบบรรทัด `onboardingStatus: roleData.onboardingStatus,`
- `system.controller.ts` update user สาย COMPANY: ก่อนเขียน → `assertHttpUrls(roleData, ["website", "locationMapUrl"])` (คง `onboardingStatus` ไว้ — staff ตั้งได้)

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

---

### Task 3: `PATCH /students/profile` — whitelist, advisor ต้องเป็นอาจารย์จริง, ทักษะ

**Files:**
- Modify: `backend/src/controllers/students.controller.ts` (`updateStudentProfileHandler`)
- Test: `backend/tests/student-profile-whitelist.test.ts`

**Interfaces — Consumes:** ไม่มี (Task 1 ตรวจลิงก์ที่ schema แล้ว)

> route นี้อนุญาตแค่ `STUDENT, ADMIN` (`students.routes.ts:56`) — staff แก้ข้อมูลนักศึกษาผ่าน `PATCH /users/:id` อยู่แล้ว จึงไม่เพิ่ม STAFF ที่ route นี้

- [ ] **Step 1: เทสต์ที่ fail**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const patch = async (email: string, body: Record<string, unknown>) =>
  request(app).patch("/api/students/profile").set("Authorization", `Bearer ${await loginAs(email)}`).send(body);

describe("student editing their own profile", () => {
  it("cannot change student code, advisor, status, year, major, program, term or academic year", async () => {
    const before = await prisma.studentProfile.findFirstOrThrow({ where: { studentId: "65010001" } });
    const mali = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "mali@showpro.local" } } });
    const res = await patch("alice@student.showpro.local", {
      studentId: "99999999", advisorId: mali.id, academicStatus: "honors", year: 4, major: "X", program: "X", semester: 3, academicYear: "1999",
      cvUrl: "https://cv.example.com/a.pdf",
    });
    expect(res.status).toBe(200);
    const after = await prisma.studentProfile.findUniqueOrThrow({ where: { id: before.id } });
    for (const key of ["studentId", "advisorId", "academicStatus", "year", "major", "program", "semester", "academicYear"] as const) {
      expect(after[key]).toEqual(before[key]);
    }
    expect(after.cvUrl).toBe("https://cv.example.com/a.pdf");
  });

  it("cannot verify their own skills, and keeps an existing verification when re-saving", async () => {
    const alice = await prisma.studentProfile.findFirstOrThrow({ where: { studentId: "65010001" } });
    const skill = await prisma.skill.upsert({ where: { name: "S-b2 Verified Skill" }, update: {}, create: { name: "S-b2 Verified Skill", category: "programming" } });
    await prisma.studentSkill.upsert({
      where: { studentId_skillId: { studentId: alice.id, skillId: skill.id } },
      update: { verifiedBy: "Dr. Narin" },
      create: { studentId: alice.id, skillId: skill.id, level: "intermediate", verifiedBy: "Dr. Narin" },
    });
    const current = await prisma.studentSkill.findMany({ where: { studentId: alice.id }, include: { skill: true } });
    const skills = [
      ...current.map((s) => ({ name: s.skill.name, category: s.skill.category, level: s.level, verifiedBy: s.skill.name === skill.name ? "Myself" : undefined })),
      { name: "S-b2 Self Claimed", category: "programming", level: "advanced", verifiedBy: "Dr. Fake" },
    ];
    expect((await patch("alice@student.showpro.local", { skills })).status).toBe(200);
    const after = await prisma.studentSkill.findMany({ where: { studentId: alice.id }, include: { skill: true } });
    expect(after.find((s) => s.skill.name === "S-b2 Verified Skill")?.verifiedBy).toBe("Dr. Narin");
    expect(after.find((s) => s.skill.name === "S-b2 Self Claimed")?.verifiedBy ?? null).toBeNull();
  });

  it("cannot rewrite the category of a skill shared by everyone", async () => {
    const shared = await prisma.skill.upsert({ where: { name: "S-b2 Shared Skill" }, update: { category: "programming" }, create: { name: "S-b2 Shared Skill", category: "programming" } });
    await patch("alice@student.showpro.local", { skills: [{ name: "S-b2 Shared Skill", category: "cooking", level: "beginner" }] });
    expect((await prisma.skill.findUniqueOrThrow({ where: { id: shared.id } })).category).toBe("programming");
  });
});

describe("admin editing a student", () => {
  it("selects the student by code without overwriting the code", async () => {
    const res = await patch("admin@showpro.local", { studentId: "65010002", year: 4 });
    expect(res.status).toBe(200);
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
    expect(bob.studentId).toBe("65010002");
    expect(bob.year).toBe(4);
  });

  it("can only assign an advisor that is a real lecturer profile", async () => {
    expect((await patch("admin@showpro.local", { studentId: "65010002", advisorId: "not-a-lecturer" })).status).toBe(400);
    const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
    expect((await patch("admin@showpro.local", { studentId: "65010002", advisorId: narin.id })).status).toBe(200);
  });
});
```
> หมายเหตุ: เทสต์ "แก้หลายอย่าง" ข้อแรกตั้งใจให้ alice ส่งพร้อมกันทุก field เพื่อพิสูจน์ว่าไม่มี field ไหนหลุด · เทสต์ skills ตั้งใจส่ง "Myself" ทับทักษะที่ยืนยันแล้ว เพื่อพิสูจน์ว่าค่าเดิมไม่ถูกทับ

- [ ] **Step 2: รัน → FAIL** — `npx vitest run tests/student-profile-whitelist.test.ts` · Expected: ค่าการศึกษาเปลี่ยน, verifiedBy เป็น "Myself"/"Dr. Fake", category เป็น cooking, studentId ของ bob กลายเป็นค่าอื่น, advisor ปลอมได้ 200 หรือ 500

- [ ] **Step 3: แก้โค้ด** `updateStudentProfileHandler`

```ts
const STUDENT_EDITABLE = ["cvUrl"] as const;
const ADMIN_EDITABLE = ["cvUrl", "major", "program", "year", "semester", "academicYear", "academicStatus", "advisorId"] as const;

// แทน `const { skills, portfolio, consent, ...studentData } = req.body;`
const { skills, portfolio, consent } = req.body;
const editable = currentUser.role === Role.STUDENT ? STUDENT_EDITABLE : ADMIN_EDITABLE;
// studentId is the admin's selector for which student to edit; it is never written (audit S6)
const studentData = Object.fromEntries(
  editable.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]),
);

if (studentData.advisorId) {
  const advisor = await prisma.lecturerProfile.findUnique({ where: { id: String(studentData.advisorId) }, select: { id: true } });
  if (!advisor) throw new AppError(400, "advisorId must be a lecturer profile id");
}
const canVerifySkills = currentUser.role !== Role.STUDENT;
```
- ในลูป skills: `tx.skill.upsert({ where: { name: item.name }, update: {}, create: { name: item.name, category: item.category } })` (ไม่แก้หมวดของทักษะกลาง)
- `tx.studentSkill.upsert`: `update: { level, yearsOfExperience: item.yearsOfExperience ?? 0, ...(canVerifySkills && item.verifiedBy !== undefined ? { verifiedBy: item.verifiedBy } : {}) }` · `create: { ..., verifiedBy: canVerifySkills ? item.verifiedBy : null }`

- [ ] **Step 4: รัน → PASS** · ทั้งชุด · tsc

---

### Task 4: หน้าเว็บ — เปิดเฉพาะลิงก์ที่ปลอดภัย + ภาคเรียนในหน้า Settings แก้ไม่ได้สำหรับนักศึกษา

**Files:**
- Create: `src/lib/safe-url.ts`, `src/lib/safe-url.test.ts`, `e2e/safe-links.spec.ts`
- Modify (ทุกจุดที่เปิดลิงก์จากข้อมูล):
  - `src/pages/TalentSearch.tsx:405,408` (`<a href>` github/linkedin)
  - `src/pages/PublicPortfolio.tsx:128,133,138,143,243` (`window.open` github/linkedin/website/cv/project)
  - `src/pages/StudentProfiles.tsx:455-457` (github/linkedin/cv)
  - `src/pages/Portfolio.tsx:552,770,773,776` (cv/linkedin/github/website)
  - `src/pages/Applicants.tsx:473` (resume)
  - `src/pages/Network.tsx:280` (company website)
  - `src/components/common/NotificationCenter.tsx:62`, `src/components/layout/Header.tsx:128`, `src/pages/Notifications.tsx:125` (`actionUrl` — path ภายในเท่านั้น)
  - `src/pages/Settings.tsx:428` (Select ภาคเรียน: `disabled={user?.role === 'student'}` + `data-testid="semester-select"` ที่ `SelectTrigger`)
> ก่อนแก้: `grep -rnE "window\.open\(|href=\{|location\.href|navigate\([a-zA-Z.]*actionUrl" src` อีกรอบ — ถ้าเจอจุดที่เปิดลิงก์จากข้อมูลผู้ใช้นอกรายการนี้ ให้แก้ด้วยและบันทึกใน ledger · `URL.createObjectURL`, `mailto:`/`tel:` ที่สร้างจากค่าคงที่ ไม่ต้องแก้

**Interfaces — Produces:**
- `safeExternalUrl(value: unknown): string | undefined` — trim แล้วคืนค่าเมื่อขึ้นต้น `http://`/`https://` และ `new URL()` ผ่าน · อื่นคืน `undefined`
- `openExternal(value: unknown): void` — `window.open(safe, '_blank', 'noopener,noreferrer')` เมื่อปลอดภัย · ไม่ปลอดภัยไม่ทำอะไร
- `safeInternalPath(value: unknown): string | undefined` — ขึ้นต้น `/` และไม่ขึ้นต้น `//` หรือ `/\`

- [ ] **Step 1: unit test ที่ fail** — `src/lib/safe-url.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { safeExternalUrl, safeInternalPath } from './safe-url';

describe('safeExternalUrl', () => {
  it('keeps http and https links', () => {
    expect(safeExternalUrl('https://github.com/alice')).toBe('https://github.com/alice');
    expect(safeExternalUrl(' http://example.com ')).toBe('http://example.com');
  });
  it.each(['javascript:alert(1)', '  JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', '', undefined, null, 42])('drops %s', (value) => {
    expect(safeExternalUrl(value)).toBeUndefined();
  });
});

describe('safeInternalPath', () => {
  it('keeps in-app paths', () => {
    expect(safeInternalPath('/appointments')).toBe('/appointments');
  });
  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', ''])('drops %s', (value) => {
    expect(safeInternalPath(value)).toBeUndefined();
  });
});
```

- [ ] **Step 2: รัน → FAIL** — `npx vitest run src/lib/safe-url.test.ts` · Expected: Cannot find module './safe-url'

- [ ] **Step 3: เขียน `src/lib/safe-url.ts`**

```ts
/** Links typed by users are opened only when they are plain web links (audit S5). */
export const safeExternalUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return undefined;
  }
};

export const openExternal = (value: unknown) => {
  const url = safeExternalUrl(value);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
};

export const safeInternalPath = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined;
  return value;
};
```

- [ ] **Step 4: รัน unit → PASS**

- [ ] **Step 5: E2E ที่ fail** — `e2e/safe-links.spec.ts` (mock response แทนการเขียนข้อมูลอันตรายลง DB)

```ts
import { expect, test } from "@playwright/test";

test("a stored javascript: link on a public portfolio is never opened", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(url));
      return null;
    }) as typeof window.open;
  });
  await page.route("**/api/students/profile/**", async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.profile.portfolio = { ...(body.profile.portfolio ?? {}), githubUrl: "javascript:alert(1)", linkedinUrl: "javascript:alert(2)", personalWebsite: "javascript:alert(3)", isPublic: true };
    body.profile.cvUrl = "javascript:alert(4)";
    await route.fulfill({ response: res, json: body });
  });
  await page.goto("/portfolio/65010001");
  await page.waitForLoadState("networkidle");
  const buttons = page.locator("button:has(svg.lucide-github), button:has(svg.lucide-linkedin), button:has(svg.lucide-globe)");
  for (let i = 0; i < (await buttons.count()); i++) await buttons.nth(i).click();
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened.filter((u) => /^\s*javascript:/i.test(u))).toEqual([]);
});

test("a student cannot change the semester in Settings", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "alice@student.showpro.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/settings");
  await expect(page.getByTestId("semester-select")).toBeDisabled();
});
```
> ก่อนรัน: เปิด `/portfolio/65010001` ดูว่าหน้า public ของ alice แสดงปุ่ม github/linkedin/globe จริง (ต้องมี `portfolio.isPublic` + `consent.allowPortfolioSharing` — mock ด้านบนตั้ง `isPublic` แล้ว ถ้ายังไม่ขึ้นให้ตั้ง `consent.allowPortfolioSharing` ใน mock ด้วย) · ตรวจชื่อ class ของ icon (`lucide-github` ฯลฯ) ใน DOM จริง แล้วแก้ selector ให้ตรง · **ต้องเห็นอย่างน้อย 1 ปุ่ม** ไม่งั้นเทสต์ผ่านแบบหลอก — เพิ่ม `expect(await buttons.count()).toBeGreaterThan(0)` ก่อนลูป

- [ ] **Step 6: รัน E2E → FAIL** — `npx playwright test e2e/safe-links.spec.ts` (ต้องมี backend :4000 + vite :8080 รันจาก worktree) · Expected: `opened` มี `javascript:` และ select ภาคเรียนยังกดได้

- [ ] **Step 7: แก้ทุกจุดในรายการ Files**
- `window.open(x, ...)` → `openExternal(x)`
- `<a href={x}>` → `href={safeExternalUrl(x)}` และไม่แสดงลิงก์เมื่อเป็น `undefined`
- `window.location.href = notification.actionUrl` / `navigate(notification.actionUrl)` → `const path = safeInternalPath(notification.actionUrl); if (path) navigate(path);`
- Settings: `<Select value={semester} onValueChange={setSemester} disabled={user?.role === 'student'}>` + `<SelectTrigger data-testid="semester-select" ...>`

- [ ] **Step 8: รันทั้งหมด** — `npx vitest run src` PASS · `npx playwright test` PASS ทั้งหมด (รวม `role-pages`, `auth-hardening`, `temp-credentials`) · `npm run build` สำเร็จ · `npx tsc --noEmit -p tsconfig.app.json` ไม่มี error ใหม่ (baseline 3) · ⚠️ ก่อนรัน E2E รีสตาร์ต backend dev (tsx watch ไม่โหลดโค้ดใหม่บ่อย)

- [ ] **Step 9: ยืนยันสดกับ dev server** — login alice ด้วย curl แล้ว `PATCH /api/students/profile {"portfolio":{"githubUrl":"javascript:alert(1)"}}` ต้องได้ 400 (ข้อมูล alice ไม่เปลี่ยน)
