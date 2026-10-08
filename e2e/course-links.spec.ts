import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const CTA_TEXT = "ยังไม่มีรายวิชาที่ลงทะเบียนในระบบ คลิกเพื่อไปหน้าลงทะเบียน";

async function token(request: APIRequestContext, email: string, password = "Password123!") {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password } })).json()).token as string;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

async function expectRegistrationTab(page: Page) {
  await page.waitForURL(/\/courses\?tab=registration/);
  await expect(page.getByRole("tab", { selected: true })).toHaveAttribute("data-value", "registration");
}

/** a student with no enrolment, password already changed */
async function freshStudent(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const email = `e2e-cta-${stamp}@example.com`;
  const res = await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `68${String(stamp).slice(-7)}`, name: "CTA Student", nameThai: "นักศึกษา ทดสอบ", email, major: "DII", program: "DII", year: 1, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } });
  expect(res.ok()).toBeTruthy();
  const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
  expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: "Password123!" } })).ok()).toBeTruthy();
  return email;
}

const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const todayKey = () => ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(`${bangkokToday()}T00:00:00Z`).getUTCDay()];

test("courses tabs follow ?tab= both ways", async ({ page }) => {
  await login(page, "chompoo@student.showpro.local");
  await page.goto("/courses?tab=registration");
  await expect(page.getByRole("tab", { selected: true })).toHaveAttribute("data-value", "registration");
  await page.getByRole("tab", { selected: false }).click();
  await expect(page).toHaveURL(/tab=my-courses/);
});

test("a student with no courses gets a register call-to-action, not a dead end", async ({ page, request }) => {
  const email = await freshStudent(request);
  await login(page, email);
  const dashCta = page.getByTestId("register-cta");
  await expect(dashCta).toHaveText(CTA_TEXT);
  await dashCta.click();
  await expectRegistrationTab(page);

  await page.goto("/schedule");
  const scheduleCta = page.getByTestId("register-cta");
  await expect(scheduleCta).toHaveText(CTA_TEXT);
  await scheduleCta.click();
  await expectRegistrationTab(page);
});

test("dashboard and schedule course items lead to /courses", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers;
  const code = `CL${Date.now().toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: lecturers[0].id, status: "active",
    sections: [{ number: "01", maxStudents: 5, schedule: [{ day: todayKey(), startTime: "07:00", endTime: "08:00" }] }],
  } });
  expect(created.ok()).toBeTruthy();
  const course = (await created.json()).course as { id: string; sections: Array<{ id: string }> };
  await login(page, "chompoo@student.showpro.local");
  const studentToken = await page.evaluate(() => sessionStorage.getItem("xchange_auth_token") ?? localStorage.getItem("xchange_auth_token"));
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: course.id, sectionId: course.sections[0].id } })).ok()).toBeTruthy();
  try {
    await page.goto("/dashboard");
    await page.getByTestId("dashboard-courses-title").click();
    await page.waitForURL("**/courses");
    await page.goto("/dashboard");
    await page.getByTestId("dashboard-course").first().click();
    await page.waitForURL("**/courses");
    await page.goto("/dashboard");
    await page.getByTestId("dashboard-course").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/courses");

    await page.goto("/schedule");
    await page.getByTestId("schedule-total-courses").click();
    await page.waitForURL("**/courses");

    await page.goto("/schedule");
    await page.locator(`[data-testid=today-class][data-course="${code}"]`).click();
    await page.waitForURL("**/courses");

    await page.goto("/schedule?view=month");
    await page.locator(`[data-testid=month-day][data-date="${bangkokToday()}"]`).click();
    await page.getByTestId("month-dialog-class").filter({ hasText: code }).click();
    await page.waitForURL("**/courses");
  } finally {
    await request.delete(`${API}/enrollments/course/${course.id}`, { headers: student });
    await request.patch(`${API}/courses/${course.id}`, { headers: staff, data: { academicYear: "2500" } });
  }
});

test("a failed course load says so instead of telling the student to register", async ({ page }) => {
  await login(page, "chompoo@student.showpro.local");
  await page.route("**/api/enrollments", (route) => route.request().method() === "GET" ? route.fulfill({ status: 500, body: "{}" }) : route.continue());
  for (const path of ["/courses", "/schedule", "/dashboard"]) {
    await page.goto(path);
    await expect(page.getByTestId("courses-load-error")).toBeVisible();
    await expect(page.getByTestId("register-cta")).toHaveCount(0);
  }
});
