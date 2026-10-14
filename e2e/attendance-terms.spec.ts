import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API } from "./env";


async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/** the newest term with an open course, from the API, and that term's courses */
async function expectedTerm(request: APIRequestContext) {
  const token = (await (await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } })).json()).token;
  const courses = (await (await request.get(`${API}/courses`, { headers: { Authorization: `Bearer ${token}` } })).json()).courses as Array<{ code: string; semester: number; academicYear: string; status: string }>;
  const open = courses.filter((c) => c.status === "active").sort((a, b) => Number(b.academicYear) - Number(a.academicYear) || b.semester - a.semester)[0];
  const key = `${open.semester}/${open.academicYear}`;
  return { key, count: courses.filter((c) => `${c.semester}/${c.academicYear}` === key).length, total: courses.length };
}

/** a course in an older term, made by staff, so the picker has another term to leave out even on a fresh seed */
async function olderTermCourse(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${(await (await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } })).json()).token}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers;
  const code = `E2EOLD${Date.now().toString(36).toUpperCase()}`;
  const res = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: `Older term ${code}`, nameThai: `เทอมเก่า ${code}`, credits: 1, semester: 1, academicYear: "2560", year: 4,
    lecturerId: lecturers[0].id, status: "active",
  } });
  expect(res.ok()).toBeTruthy();
  const { id } = (await res.json()).course as { id: string };
  return { code, park: () => request.patch(`${API}/courses/${id}`, { headers: staff, data: { academicYear: "2500", status: "archived" } }) };
}

// owner decision 9/10/69 (G4 รอง c): the attendance picker used to list every course of every term (279)
test("admin attendance starts at the newest open term, lists only its courses, and can search", async ({ page, request }) => {
  const older = await olderTermCourse(request);
  try {
    const want = await expectedTerm(request);
    expect(want.count).toBeLessThan(want.total);
    await login(page, "admin@showpro.local");
    await page.goto("/attendance");
    await expect(page.getByTestId("attendance-term")).toContainText(want.key, { timeout: 15_000 });
    await page.getByTestId("attendance-course").click();
    await expect(page.getByRole("option")).toHaveCount(want.count);
    await expect(page.getByRole("option", { name: new RegExp(older.code) })).toHaveCount(0);
    await page.keyboard.press("Escape");
  } finally {
    await older.park();
  }

  await page.getByRole("searchbox", { name: /ค้นหารายวิชา|Search courses/ }).fill("DII340");
  await page.getByTestId("attendance-course").click();
  const options = page.getByRole("option");
  for (const text of await options.allInnerTexts()) expect(text).toContain("DII340");
});
