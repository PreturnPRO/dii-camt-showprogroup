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

/** A new student with a CV on the profile who applies to a Northern Soft job; `share` decides their consent. */
async function applicant(request: APIRequestContext, share: boolean) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const email = `e2e-cv-${stamp}@example.com`;
  const nameThai = `ผู้สมัคร ซีวี ${stamp}`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `67${String(stamp).slice(-7)}`, name: "CV E2E", nameThai, email, major: "DII", program: "DII", year: 3, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
  expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: PASSWORD } })).ok()).toBeTruthy();
  const student = { Authorization: `Bearer ${await token(request, email)}` };
  expect((await request.patch(`${API}/students/profile`, { headers: student, data: { cvUrl: `https://cv.example.com/${stamp}.pdf`, consent: { allowDataSharing: share } } })).ok()).toBeTruthy();
  const jobs = (await (await request.get(`${API}/jobs`, { headers: student })).json()).jobs as Array<{ id: string; company?: { companyName?: string }; type: string; status: string }>;
  const job = jobs.find((j) => j.company?.companyName?.includes("Northern") && j.type !== "skill_requirement" && j.status === "open")!;
  expect(job).toBeTruthy();
  expect((await request.post(`${API}/apply/${job.id}`, { headers: student, data: {} })).status()).toBe(201);
  return { nameThai, cvUrl: `https://cv.example.com/${stamp}.pdf` };
}

async function openApplicant(page: Page, nameThai: string) {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url?: string | URL) => { (window as unknown as { __opened: string[] }).__opened.push(String(url)); return null; }) as typeof window.open;
  });
  await login(page, "talent@northernsoft.local");
  await page.goto("/applicants");
  await page.getByText(nameThai).first().click();
}

test("a company opens the CV a student shared, and never sees the student's email", async ({ page, request }) => {
  const shared = await applicant(request, true);
  await openApplicant(page, shared.nameThai);
  await page.getByRole("button", { name: /เปิด Resume|Open Resume/ }).click();
  expect(await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)).toEqual([shared.cvUrl]);
  await expect(page.getByText(/e2e-cv-\d+@example\.com/)).toHaveCount(0);
});

test("a CV the student did not share stays closed, and the company is told why", async ({ page, request }) => {
  const notShared = await applicant(request, false);
  await openApplicant(page, notShared.nameThai);
  await page.getByRole("button", { name: /เปิด Resume|Open Resume/ }).click();
  await expect(page.getByText(/ยังไม่ได้เปิดสิทธิ์ให้บริษัทนี้ดู|has not shared it/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)).toEqual([]);
});

test("forgot password sends people to staff when the system cannot email a link", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByTestId("reset-contact-staff")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /ส่งลิงก์รีเซ็ต|Send Reset Link/ })).toHaveCount(0);
});
