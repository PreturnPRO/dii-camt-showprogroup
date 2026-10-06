import { expect, test } from "@playwright/test";

const API = "http://localhost:4000/api";

test("a lecturer's grading weights are really saved", async ({ page, request }) => {
  const token = (await (await request.post(`${API}/auth/login`, { data: { email: "narin@showpro.local", password: "Password123!" } })).json()).token;
  // the course list carries the grading criteria (the detail route does not)
  const findCourse = async () =>
    (await (await request.get(`${API}/courses?q=DII340`, { headers: { Authorization: `Bearer ${token}` } })).json()).courses.find((c: { code: string }) => c.code === "DII340");
  const course = await findCourse();
  const [w0, w1] = course.gradingCriteria.map((c: { weightPercentage: number }) => c.weightPercentage);

  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "narin@showpro.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");

  await page.goto(`/courses/${course.id}/grading`);
  await expect(page.getByTestId("criterion-weight-0")).toHaveValue(String(w0));
  // move 5 points from the second criterion to the first; the total stays 100
  await page.getByTestId("criterion-weight-0").fill(String(w0 + 5));
  await page.getByTestId("criterion-weight-1").fill(String(w1 - 5));
  await page.getByRole("button", { name: /save|บันทึก/i }).last().click();
  await page.waitForURL("**/courses");

  // reopening the page shows what was saved, not the page's defaults
  await page.goto(`/courses/${course.id}/grading`);
  await expect(page.getByTestId("criterion-weight-0")).toHaveValue(String(w0 + 5));
  const after = await findCourse();
  expect(after.gradingCriteria.map((c: { weightPercentage: number }) => c.weightPercentage).slice(0, 2)).toEqual([w0 + 5, w1 - 5]);

  // put the seed back for other runs
  await request.patch(`${API}/courses/${course.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { gradingCriteria: course.gradingCriteria.map(({ id, name, weightPercentage, maxScore, orderIndex }: Record<string, unknown>) => ({ id, name, weightPercentage, maxScore, orderIndex })) },
  });
});
