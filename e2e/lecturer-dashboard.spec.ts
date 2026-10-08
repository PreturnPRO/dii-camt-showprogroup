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

async function narinData(request: APIRequestContext) {
  const login = await request.post(`${API}/auth/login`, { data: { email: "narin@showpro.local", password: "Password123!" } });
  const auth = { Authorization: `Bearer ${(await login.json()).token}` };
  const schedule = (await (await request.get(`${API}/courses/lecturer/schedule`, { headers: auth })).json()).schedule as Array<{
    id: string; code: string; semester: number; academicYear: string; status: string; enrollments: Array<{ status: string; letterGrade: string | null }>;
  }>;
  return { auth, schedule };
}

test("the lecturer dashboard lists this term's courses with real student and awaiting-grade counts", async ({ page, request }) => {
  const { schedule } = await narinData(request);
  // the term being taught: newest one with a non-pending course that still has a student
  const newestFirst = [...schedule].sort((a, b) => Number(b.academicYear) - Number(a.academicYear) || b.semester - a.semester);
  const newest = newestFirst.find((c) => c.status !== "pending" && c.enrollments.some((e) => e.status !== "dropped")) ?? newestFirst[0];
  const thisTerm = schedule.filter((c) => c.academicYear === newest.academicYear && c.semester === newest.semester);
  const older = schedule.filter((c) => !thisTerm.includes(c));

  await login(page, "narin@showpro.local");
  const cards = page.getByTestId("lecturer-course");
  await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  await expect(cards).toHaveCount(Math.min(thisTerm.length, 5));
  for (const course of older) await expect(cards.filter({ hasText: course.code })).toHaveCount(0);

  const firstCode = (await cards.first().locator(".font-medium").first().innerText()).trim();
  const first = thisTerm.find((c) => c.code === firstCode)!;
  const active = first.enrollments.filter((e) => e.status !== "dropped");
  await expect(cards.first().getByTestId("course-enrolled")).toContainText(String(active.length));
  await expect(cards.first().getByTestId("course-awaiting")).toContainText(String(active.filter((e) => !e.letterGrade).length));

  await cards.first().getByRole("link", { name: /เช็คชื่อ|Attendance/ }).click();
  await expect(page).toHaveURL(new RegExp(`/attendance\\?courseId=${first.id}`));
  await expect(page.locator("button[role=combobox]").first()).toContainText(first.code);

  await page.goBack();
  await page.getByTestId("lecturer-course").first().getByRole("link", { name: /ให้เกรด|Grades/ }).click();
  await expect(page).toHaveURL(new RegExp(`/grades\\?courseId=${first.id}`));
  await expect(page.getByTestId("grade-course-filter")).toHaveValue(first.id);
});

test("upcoming appointments never include ones already past", async ({ page, request }) => {
  const { auth } = await narinData(request);
  const appointments = (await (await request.get(`${API}/appointments`, { headers: auth })).json()).appointments as Array<{ date: string; purpose: string; status: string }>;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const past = appointments.filter((a) => a.date.slice(0, 10) < today && a.purpose);
  expect(past.length, "the seed has past appointments (e.g. 6 May) — otherwise this checks nothing").toBeGreaterThan(0);
  await login(page, "narin@showpro.local");
  await expect(page.getByTestId("lecturer-course").first()).toBeVisible({ timeout: 15_000 });
  for (const a of past) await expect(page.getByText(a.purpose, { exact: true })).toHaveCount(0);
});
