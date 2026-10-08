import { expect, test } from "@playwright/test";

const API = "http://localhost:4000/api";

test("a course imported from CSV gets a section with the file's seat limit", async ({ page, request }) => {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "staff@showpro.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/courses");
  await page.waitForLoadState("networkidle");

  const code = `CI${Date.now().toString(36).toUpperCase()}`;
  const csv = `code,name,nameThai,credits,semester,academicYear,year,maxStudents\n${code},Import Course,วิชานำเข้า,3,1,2500,1,30\n`;
  const created = page.waitForResponse((r) => r.url().endsWith("/api/courses") && r.request().method() === "POST");
  await page.locator("input[type=file][accept='.csv,.xlsx,.xls']").setInputFiles({ name: "courses.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  const response = await created;
  expect(response.status()).toBe(201);
  const course = (await response.json()).course as { id: string };

  const staffToken = (await (await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } })).json()).token;
  const detail = (await (await request.get(`${API}/courses/${course.id}`, { headers: { Authorization: `Bearer ${staffToken}` } })).json()).course;
  expect(detail.sections).toHaveLength(1);
  expect(detail.sections[0].maxStudents).toBe(30);
});
