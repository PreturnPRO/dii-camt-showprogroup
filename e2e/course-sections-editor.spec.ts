import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// G4: the course editor keeps every section and each class time; an open course's shape is staff's to change
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

async function twoSectionCourse(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers as Array<{ id: string; user: { email: string } }>;
  const narin = lecturers.find((l) => l.user.email === "narin@showpro.local")!;
  const code = `SE${Date.now().toString(36).toUpperCase()}`;
  const res = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 3, semester: 1, academicYear: "2500", year: 2, lecturerId: narin.id, status: "active",
    sections: [
      { number: "01", maxStudents: 10, schedule: [{ day: "monday", startTime: "09:00", endTime: "12:00" }, { day: "wednesday", startTime: "13:00", endTime: "15:00" }] },
      { number: "02", maxStudents: 10, schedule: [] },
    ],
  } });
  expect(res.ok()).toBeTruthy();
  return { staff, course: (await res.json()).course as { id: string; code: string } };
}

test("staff edit a two-section course: both sections and each class time survive, and a class added to 02 is saved", async ({ page, request }) => {
  const { staff, course } = await twoSectionCourse(request);
  await login(page, "staff@showpro.local");
  await page.goto("/courses");
  await page.getByTestId(`edit-course-${course.code}`).first().click();
  await expect(page.getByTestId("section-row")).toHaveCount(2);
  await page.getByTestId("section-row").nth(1).getByTestId("section-add-slot").click();
  const saved = page.waitForResponse((r) => r.url().endsWith(`/api/courses/${course.id}`) && r.request().method() === "PATCH");
  await page.getByRole("button", { name: /บันทึก|Save/ }).last().click();
  expect((await saved).status()).toBe(200);

  const detail = (await (await request.get(`${API}/courses/${course.id}`, { headers: staff })).json()).course as { sections: Array<{ number: string; schedule: Array<{ day: string; startTime: string }> }> };
  const byNumber = Object.fromEntries(detail.sections.map((s) => [s.number, s]));
  expect(Object.keys(byNumber).sort()).toEqual(["01", "02"]);
  expect(byNumber["01"].schedule.map((s) => `${s.day} ${s.startTime}`).sort()).toEqual(["monday 09:00", "wednesday 13:00"]);
  expect(byNumber["02"].schedule).toHaveLength(1);
});

test("the lecturer of an open course sees its shape locked and can still save the description", async ({ page, request }) => {
  const { course } = await twoSectionCourse(request);
  await login(page, "narin@showpro.local");
  await page.goto("/courses");
  await page.getByTestId(`edit-course-${course.code}`).first().click();
  await expect(page.getByTestId("course-shape-locked")).toBeVisible();
  await expect(page.locator("#course-credits")).toBeDisabled();
  await expect(page.getByTestId("section-add")).toBeDisabled();
  await page.locator("#course-description").fill("คำอธิบายใหม่");
  const saved = page.waitForResponse((r) => r.url().endsWith(`/api/courses/${course.id}`) && r.request().method() === "PATCH");
  await page.getByRole("button", { name: /บันทึก|Save/ }).last().click();
  expect((await saved).status()).toBe(200);
});
