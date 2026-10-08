import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const PASSWORD = "Password123!";

async function token(request: APIRequestContext, email: string, password = PASSWORD) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token as string;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", PASSWORD);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/** A brand-new student (so no seed data is touched) who has written their first diary entry. */
async function freshInternWithEntry(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const email = `e2e-intern-${stamp}@example.com`;
  const code = `66${String(stamp).slice(-7)}`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: code, name: "Intern E2E", nameThai: `นักศึกษา ฝึกงาน ${stamp}`, email, major: "DII", program: "DII", year: 3, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
  expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: PASSWORD } })).ok()).toBeTruthy();
  const student = { Authorization: `Bearer ${await token(request, email)}` };
  const created = await request.post(`${API}/internship/logs`, { headers: student, data: { date: "2026-10-01", hours: 8, activities: "Set up the dev machine" } });
  expect(created.status()).toBe(201);
  const internships = (await (await request.get(`${API}/internships`, { headers: staff })).json()).internships as Array<{ id: string; status: string; student: { studentId: string } }>;
  const record = internships.find((r) => r.student.studentId === code)!;
  const log = (await created.json()).log as { id: string; updatedAt: string };
  return { staff, student, email, code, record, logId: log.id, logUpdatedAt: log.updatedAt };
}

test("the first diary entry starts the internship; staff mark it completed, which unlocks the certificate", async ({ page, request }) => {
  const intern = await freshInternWithEntry(request);
  expect(intern.record.status).toBe("in_progress");
  const certificate = `${API}/documents/internship-certificate?studentId=${intern.code}`;
  expect((await request.get(certificate, { headers: intern.staff })).status()).toBe(409);

  await login(page, "staff@showpro.local");
  await page.goto(`/intern-tracking?internId=${intern.record.id}`);
  await expect(page.getByTestId("intern-status-label")).toHaveText("กำลังฝึกงาน", { timeout: 15_000 });
  await page.getByRole("button", { name: "บันทึกว่าฝึกงานจบแล้ว" }).click();
  await expect(page.getByTestId("intern-status-label")).toHaveText("ฝึกงานจบแล้ว");
  // a finished diary is no longer reviewed
  await expect(page.getByText("การฝึกงานจบหรือถูกยกเลิกแล้ว ไม่ตรวจบันทึกเพิ่ม").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "อนุมัติ", exact: true })).toHaveCount(0);

  expect((await request.get(certificate, { headers: intern.staff })).status()).toBe(200);

  // the student's diary is now closed
  const studentPage = await page.context().browser()!.newPage();
  await login(studentPage, intern.email);
  await studentPage.goto("/internships");
  await studentPage.getByRole("tab", { name: "ไดอารี่บันทึกฝึกงาน" }).click();
  await expect(studentPage.getByTestId("diary-closed")).toBeVisible({ timeout: 15_000 });
  await expect(studentPage.getByRole("button", { name: "บันทึกการทำงานวันนี้" })).toHaveCount(0);
  await expect(studentPage.getByTestId("diary-edit")).toHaveCount(0);
  await studentPage.close();

  // taking "completed" back asks first, because it revokes the certificate just issued
  await page.getByRole("button", { name: "กลับเป็นกำลังฝึกงาน" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("เพิกถอน");
  await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  await expect(page.getByTestId("intern-status-label")).toHaveText("ฝึกงานจบแล้ว");
  await page.getByRole("button", { name: "กลับเป็นกำลังฝึกงาน" }).click();
  await page.getByRole("button", { name: "ยืนยันและเพิกถอน" }).click();
  await expect(page.getByTestId("intern-status-label")).toHaveText("กำลังฝึกงาน");
  await expect(page.getByText(/เพิกถอนใบรับรองฝึกงาน 1 ฉบับ/)).toBeVisible();
  expect((await request.get(certificate, { headers: intern.staff })).status()).toBe(409);
});

test("a reviewer who opened an entry before the student edited it cannot approve the old text", async ({ page, request }) => {
  const intern = await freshInternWithEntry(request);
  await login(page, "staff@showpro.local");
  await page.goto(`/intern-tracking?internId=${intern.record.id}&tab=daily`);
  await expect(page.getByText("Set up the dev machine")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("ความเห็นต่อบันทึก").fill("Which machine?");
  await page.getByRole("button", { name: "ขอให้แก้ไข", exact: true }).click();
  await expect(page.getByText("บันทึกผลตรวจแล้ว")).toBeVisible();

  expect((await request.patch(`${API}/internship/logs/${intern.logId}`, { headers: intern.student, data: { date: "2026-10-01", hours: 8, activities: "Set up the dev machine and VPN" } })).ok()).toBeTruthy();
  await page.getByRole("button", { name: "อนุมัติ", exact: true }).click();
  await expect(page.getByText(/บันทึกนี้เปลี่ยนไปหลังจากคุณเปิดหน้า/)).toBeVisible();
  await expect(page.getByText("Set up the dev machine and VPN")).toBeVisible();
  // the reloaded row shows the server's verdict, not the review this page saved earlier
  await expect(page.getByText("รอตรวจ", { exact: true })).toBeVisible();
  await expect(page.getByText("ความเห็น: Which machine?")).toHaveCount(0);
  await expect(page.getByLabel("ความเห็นต่อบันทึก")).toHaveValue("");
  const logs = (await (await request.get(`${API}/internship/logs`, { headers: intern.student })).json()).internship.logs as Array<{ id: string; reviewStatus: string }>;
  expect(logs.find((l) => l.id === intern.logId)!.reviewStatus).toBe("pending");

  // after reading the new text the approval goes through
  await page.getByRole("button", { name: "อนุมัติ", exact: true }).click();
  await expect(page.getByText("บันทึกผลตรวจแล้ว")).toBeVisible();
});

test("lecturers do not get the status buttons", async ({ page, request }) => {
  const narin = { Authorization: `Bearer ${await token(request, "narin@showpro.local")}` };
  const advisee = ((await (await request.get(`${API}/internships`, { headers: narin })).json()).internships as Array<{ id: string }>)[0];
  expect(advisee).toBeTruthy();
  await login(page, "narin@showpro.local");
  await page.goto(`/intern-tracking?internId=${advisee.id}`);
  await expect(page.getByTestId("intern-status")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "บันทึกว่าฝึกงานจบแล้ว" })).toHaveCount(0);
});

test("a student corrects an entry the reviewer sent back; an approved entry cannot be edited", async ({ page, request }) => {
  const intern = await freshInternWithEntry(request);
  const approved = await request.post(`${API}/internship/logs`, { headers: intern.student, data: { date: "2026-10-02", hours: 6, activities: "Wrote the onboarding notes" } });
  const approvedLog = (await approved.json()).log as { id: string; updatedAt: string };
  expect((await request.patch(`${API}/internship/logs/${intern.logId}/review`, { headers: intern.staff, data: { status: "changes_requested", comment: "Which machine?", updatedAt: intern.logUpdatedAt } })).ok()).toBeTruthy();
  expect((await request.patch(`${API}/internship/logs/${approvedLog.id}/review`, { headers: intern.staff, data: { status: "approved", updatedAt: approvedLog.updatedAt } })).ok()).toBeTruthy();

  await login(page, intern.email);
  await page.goto("/internships");
  await page.getByRole("tab", { name: "ไดอารี่บันทึกฝึกงาน" }).click();
  const sentBack = page.locator("div").filter({ hasText: "Set up the dev machine" }).filter({ has: page.getByTestId("diary-edit") }).last();
  await expect(sentBack.getByText("ขอให้แก้ไข")).toBeVisible({ timeout: 15_000 });
  await expect(sentBack.getByText("Which machine?")).toBeVisible();
  const approvedCard = page.locator("div.space-y-3").filter({ hasText: "Wrote the onboarding notes" }).last();
  await expect(approvedCard.getByText("อนุมัติแล้ว")).toBeVisible();
  await expect(approvedCard.getByTestId("diary-edit")).toHaveCount(0);

  await sentBack.getByTestId("diary-edit").click();
  await expect(page.getByRole("dialog").getByText("แก้ไขบันทึกการฝึกงาน")).toBeVisible();
  await page.fill("#logActivities", "Set up the lab MacBook (Node 22, Postgres 16)");
  await page.getByRole("button", { name: "บันทึกไดอารี่" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const edited = page.locator("div.space-y-3").filter({ hasText: "Set up the lab MacBook" }).last();
  await expect(edited.getByText("รอตรวจ")).toBeVisible();
  await expect(edited.getByText("Which machine?")).toHaveCount(0);

  const logs = (await (await request.get(`${API}/internship/logs`, { headers: intern.student })).json()).internship.logs as Array<{ id: string; activities: string; reviewStatus: string }>;
  expect(logs.find((l) => l.id === intern.logId)).toMatchObject({ activities: "Set up the lab MacBook (Node 22, Postgres 16)", reviewStatus: "pending" });
});

test("verify page: a 404 is 'not found', an outage is 'try again' (not 'forged'), and a found document shows the masked student ID", async ({ page }) => {
  await page.goto("/verify/definitely-not-a-token");
  await expect(page.getByTestId("verify-not-found")).toBeVisible({ timeout: 15_000 });

  let calls = 0;
  await page.route("**/api/documents/verify/sample-token", (route) => {
    calls += 1;
    return calls === 1
      ? route.fulfill({ status: 429, body: "{}" })
      : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, document: {
          reference: "SHOWPRO-2026-000042", kind: "internship-certificate", issuedAt: "2026-10-08T03:00:00Z", valid: false, studentIdMasked: "•••••182",
        } }) });
  });
  await page.goto("/verify/sample-token");
  await expect(page.getByTestId("verify-error")).toBeVisible();
  await expect(page.getByTestId("verify-not-found")).toHaveCount(0);
  await page.getByRole("button", { name: /ลองใหม่|Try again/ }).click();
  await expect(page.getByTestId("verify-result")).toBeVisible();
  await expect(page.getByTestId("verify-student-id")).toHaveText("•••••182");
  await expect(page.getByText(/ใบรับรองการฝึกงาน|Internship certificate/)).toBeVisible();
  await expect(page.getByText(/ถูกเพิกถอน|revoked/)).toBeVisible();
});

test("staff revoke a document by its reference after confirming", async ({ page }) => {
  let sent: unknown = null;
  await page.route("**/api/documents/revoke", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, document: { reference: "SHOWPRO-2026-000042", valid: false } }) });
  });
  await login(page, "staff@showpro.local");
  await page.goto("/documents");
  const card = page.getByTestId("revoke-card");
  const revoke = card.getByRole("button", { name: "เพิกถอน" });
  await expect(revoke).toBeDisabled();
  await card.getByLabel("เลขที่เอกสาร").fill("showpro-2026-000042");
  await revoke.click();
  expect(sent).toBeNull();
  await page.getByRole("button", { name: "ยืนยันเพิกถอน" }).click();
  await expect(page.getByText(/เพิกถอน SHOWPRO-2026-000042 แล้ว/)).toBeVisible();
  expect(sent).toEqual({ reference: "SHOWPRO-2026-000042" });
});
