import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
test.use({ viewport: { width: 1280, height: 1400 } });

async function token(request: APIRequestContext, email: string) {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

/** every Thursday of YYYY-MM */
function thursdays(month: string) {
  const [y, m] = month.split("-").map(Number);
  const out: string[] = [];
  for (let d = 1; d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); d++) {
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCDay() === 4) out.push(date.toISOString().slice(0, 10));
  }
  return out;
}

test("student schedule switches to a month view kept in the URL, built from the enrolled section", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers;
  const code = `MV${Date.now().toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: lecturers[0].id, status: "active",
    sections: [{ number: "01", maxStudents: 5, schedule: [{ day: "thursday", startTime: "13:00", endTime: "15:00" }] }],
  } });
  expect(created.ok()).toBeTruthy();
  const course = (await created.json()).course as { id: string; sections: Array<{ id: string }> };
  await login(page, "chompoo@student.showpro.local");
  const studentToken = await page.evaluate(() => sessionStorage.getItem("xchange_auth_token") ?? localStorage.getItem("xchange_auth_token"));
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: course.id, sectionId: course.sections[0].id } })).ok()).toBeTruthy();
  try {
    await page.goto("/schedule");
    await page.getByTestId("view-month").click();
    await expect(page).toHaveURL(/view=month/);
    await page.reload();
    await expect(page.getByTestId("month-calendar")).toBeVisible();

    const month = bangkokToday().slice(0, 7);
    const events = page.locator(`[data-testid=month-event][data-course="${code}"]`);
    await expect(events).toHaveCount(thursdays(month).length);
    for (const day of thursdays(month)) {
      await expect(page.locator(`[data-testid=month-day][data-date="${day}"] [data-testid=month-event][data-course="${code}"]`)).toHaveCount(1);
    }

    await page.locator(`[data-testid=month-day][data-date="${thursdays(month)[0]}"]`).click();
    await expect(page.getByRole("dialog")).toContainText(code);
    await expect(page.getByRole("dialog")).toContainText("13:00");
    await page.keyboard.press("Escape");

    await page.getByTestId("month-next").click();
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
    expect(new URL(page.url()).searchParams.get("month")).not.toBe(month);

    await page.getByTestId("view-week").click();
    await expect(page).toHaveURL(/view=week/);
    await expect(page.getByTestId("month-calendar")).toHaveCount(0);
  } finally {
    await request.delete(`${API}/enrollments/course/${course.id}`, { headers: student });
    await request.patch(`${API}/courses/${course.id}`, { headers: staff, data: { academicYear: "2500" } });
  }
});

test("lecturer month view shows the lecturer's own classes", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers as Array<{ id: string; user: { email: string } }>;
  const narin = lecturers.find((l) => l.user.email === "narin@showpro.local")!;
  const code = `ML${Date.now().toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: narin.id, status: "active",
    sections: [{ number: "01", maxStudents: 5, schedule: [{ day: "thursday", startTime: "13:00", endTime: "15:00" }] }],
  } });
  expect(created.ok()).toBeTruthy();
  const course = (await created.json()).course as { id: string };
  try {
    await login(page, "narin@showpro.local");
    await page.goto("/schedule?view=month");
    await expect(page.getByTestId("month-calendar")).toBeVisible();
    await expect(page.getByTestId("view-month")).toHaveAttribute("aria-pressed", "true");
    // the term picker defaults to the newest term; this course is in 2569/1
    const month = bangkokToday().slice(0, 7);
    await page.getByTestId("term-picker").click();
    await page.getByRole("option", { name: /1\/2569/ }).click();
    await expect(page.locator(`[data-testid=month-event][data-course="${code}"]`)).toHaveCount(thursdays(month).length);
  } finally {
    await request.patch(`${API}/courses/${course.id}`, { headers: staff, data: { academicYear: "2500" } });
  }
});

test("a malformed month or week in the URL falls back instead of crashing", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.goto("/schedule?view=month&month=2026-13");
  await expect(page.getByTestId("month-calendar")).toBeVisible();
  await page.goto("/schedule?week=2026-02-31");
  await expect(page.getByTestId("view-week")).toBeVisible();
});
