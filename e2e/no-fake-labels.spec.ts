import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// G3 (round-2 audit): screens that stated things that were not true
const API = "http://localhost:4000/api";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}
const token = async (request: APIRequestContext, email: string) =>
  (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;

test("a student's course card shows their own section time and room, and no payment claim", async ({ page, request }) => {
  const auth = { Authorization: `Bearer ${await token(request, "alice@student.showpro.local")}` };
  const enrollments = (await (await request.get(`${API}/enrollments`, { headers: auth })).json()).enrollments as Array<{ course: { code: string; semester: number; academicYear: string }; section: { schedule: Array<{ startTime: string }> } | null }>;
  await login(page, "alice@student.showpro.local");
  await page.goto("/courses");
  const main = page.locator("main");
  await expect(main.getByText("ชำระเงินแล้ว")).toHaveCount(0);
  await expect(main.getByText("ยืนยันเรียบร้อย")).toHaveCount(0);
  await expect(main.getByText("จันทร์ 09:00 - 12:00")).toHaveCount(0);
  await expect(main.getByText("ห้อง 301 อาคาร DII")).toHaveCount(0);
  await expect(main.getByText(/วิชาที่แนะนำ/)).toHaveCount(0);
  const withTimes = enrollments.find((e) => e.section?.schedule?.length);
  if (withTimes) {
    await expect(main.getByTestId("course-card-schedule").first()).toContainText(withTimes.section!.schedule[0].startTime);
  }
});

test("budget shows this month's expenses and a change computed from the records, never a fixed +12.5%", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/budget");
  await expect(page.locator("main").getByText("รายจ่ายเดือนนี้")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("main").getByText("+12.5% จากเดือนที่แล้ว")).toHaveCount(0);
});

test("network: a company without an MOU says so, and recording one asks first and only once", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const created = await request.post(`${API}/users`, { headers: staff, data: {
    name: `NoMou ${stamp}`, nameThai: `ไม่มี MOU ${stamp}`, email: `e2e-nomou-${stamp}@example.com`, role: "COMPANY",
    profile: { companyName: `NoMou ${stamp}`, companyNameThai: `ไม่มี MOU ${stamp}`, industry: "IT", size: "small" },
  } });
  expect(created.ok()).toBeTruthy();
  await login(page, "staff@showpro.local");
  await page.goto("/network");
  const card = page.locator("div").filter({ hasText: `NoMou ${stamp}` }).filter({ has: page.getByTestId("network-mou") }).last();
  await expect(card.getByText("ยังไม่มี MOU")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("MOU: Active")).toHaveCount(0);
  await card.getByTestId("network-mou").click();
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/cooperation") && r.request().method() === "POST");
  await page.getByTestId("network-mou-confirm").click();
  expect((await saved).status()).toBe(201);
  await expect(card.getByText("MOU มีผล")).toBeVisible();
  await expect(card.getByTestId("network-mou")).toBeDisabled();
});

test("the students page average GPA counts only students with a grade", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/students");
  await expect(page.getByTestId("students-avg-gpa")).not.toHaveText("0.00", { timeout: 15_000 });
  await expect(page.locator("main").getByText(/คนที่มีเกรด/)).toBeVisible();
});

test("a failed applicants load is an error, not 'no applicants'", async ({ page }) => {
  await login(page, "talent@northernsoft.local");
  await page.route("**/api/applications", (route) => route.fulfill({ status: 500, body: "{}" }));
  await page.goto("/applicants");
  await expect(page.getByTestId("applicants-load-error")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("ไม่มีผู้สมัคร")).toHaveCount(0);
});

test("on a phone, staff are labelled staff, not student", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "staff@showpro.local");
  await expect(page.getByText("เจ้าหน้าที่", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^Student$|^นักศึกษา$/)).toHaveCount(0);
});

test("network: a company whose MOU is on record (seed type \"MOU\") shows it in force", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/network");
  const card = page.locator("div").filter({ hasText: "Northern Soft" }).filter({ has: page.getByTestId("network-mou") }).last();
  await expect(card.getByText(/MOU มีผล/)).toBeVisible({ timeout: 15_000 });
  await expect(card.getByTestId("network-mou")).toBeDisabled();
});
