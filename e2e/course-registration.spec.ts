import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

async function token(request: APIRequestContext, email: string) {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;
}

/** a two-section course in chompoo's term, created by staff so the test never depends on seed courses */
async function twoSectionCourse(request: APIRequestContext) {
  const auth = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: auth })).json()).lecturers;
  const code = `E2E${Date.now().toString(36).toUpperCase()}`;
  const res = await request.post(`${API}/courses`, { headers: auth, data: {
    code, name: `Registration ${code}`, nameThai: `ทดสอบลงทะเบียน ${code}`, credits: 1, semester: 1, academicYear: "2569", year: 4,
    lecturerId: lecturers[0].id, status: "active",
    sections: [
      { number: "01", maxStudents: 5, schedule: [{ day: "saturday", startTime: "08:00", endTime: "09:00" }] },
      { number: "02", maxStudents: 5, schedule: [{ day: "sunday", startTime: "08:00", endTime: "09:00" }] },
    ],
  } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).course as { id: string; code: string; sections: Array<{ id: string; number: string }> };
}

test("student picks a section, confirms, sees API credits, and must confirm a drop", async ({ page, request }) => {
  const course = await twoSectionCourse(request);
  await login(page, "chompoo@student.showpro.local");
  const studentToken = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const headers = { Authorization: `Bearer ${studentToken}` };
  const before = (await (await request.get(`${API}/enrollments/summary`, { headers })).json()).summary;

  await page.goto("/courses");
  await expect(page.getByTestId("term-credits")).toHaveText(`${before.termCredits}/${before.maxCredits}`);
  await expect(page.locator("main").getByText(/^0%$/)).toHaveCount(0);

  await page.getByRole("tab", { name: /ลงทะเบียนเรียน|Register/ }).click();
  await page.getByTestId(`enroll-${course.code}`).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(course.code);
  await dialog.getByTestId("section-02").click();
  await dialog.getByTestId("confirm-enroll").click();
  await expect(dialog).toBeHidden();

  const enrolled = (await (await request.get(`${API}/enrollments`, { headers })).json()).enrollments
    .find((e: { courseId: string }) => e.courseId === course.id);
  expect(enrolled.sectionId).toBe(course.sections.find((s) => s.number === "02")!.id);
  await expect(page.getByTestId("term-credits")).toHaveText(`${before.termCredits + 1}/${before.maxCredits}`);

  await page.getByRole("tab", { name: /รายวิชาของฉัน|My Courses/ }).click();
  await page.getByTestId(`drop-${course.code}`).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText(course.code);
  await confirm.getByRole("button", { name: /ยกเลิก|Cancel/ }).click();
  await expect(page.getByTestId(`drop-${course.code}`)).toBeVisible(); // still enrolled
  await page.getByTestId(`drop-${course.code}`).click();
  await page.getByRole("alertdialog").getByTestId("confirm-drop").click();
  await expect(page.getByTestId(`drop-${course.code}`)).toHaveCount(0);
  await expect(page.getByTestId("term-credits")).toHaveText(`${before.termCredits}/${before.maxCredits}`);
});

test("degree card shows ungraded credits from the API, and '-' when that request fails", async ({ page, request }) => {
  await login(page, "alice@student.showpro.local");
  const studentToken = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const summary = (await (await request.get(`${API}/enrollments/summary`, { headers: { Authorization: `Bearer ${studentToken}` } })).json()).summary;
  await page.goto("/personal-dashboard");
  const value = page.getByTestId("in-progress-credits").first();
  await expect(value).toHaveText(String(summary.inProgressCredits));
  await expect(page.locator("main").getByText("กำลังเรียน (ยังไม่มีเกรด)").first()).toBeVisible();

  await page.route("**/api/enrollments/summary", (route) => route.abort());
  await page.reload();
  await expect(page.getByTestId("in-progress-credits").first()).toHaveText("-");
});
