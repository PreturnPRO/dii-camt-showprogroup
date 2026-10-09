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

  const staffToken = (await (await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } })).json()).token;
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: { Authorization: `Bearer ${staffToken}` } })).json()).lecturers as Array<{ id: string; user: { email: string } }>;
  const narin = lecturers.find((l) => l.user.email === "narin@showpro.local")!;
  const code = `CI${Date.now().toString(36).toUpperCase()}`;
  // the second row has no instructor and none is chosen: it is listed as not imported, not given to a random lecturer
  const csv = `code,name,nameThai,credits,semester,academicYear,year,maxStudents,lecturerId\n${code},Import Course,วิชานำเข้า,3,1,2500,1,30,${narin.id}\n${code}B,No Teacher,ไม่มีผู้สอน,3,1,2500,1,30,\n`;
  const created = page.waitForResponse((r) => r.url().endsWith("/api/courses") && r.request().method() === "POST");
  await page.locator("input[type=file][accept='.csv,.xlsx,.xls']").setInputFiles({ name: "courses.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  const response = await created;
  expect(response.status()).toBe(201);
  const course = (await response.json()).course as { id: string };

  await expect(page.getByTestId("import-problems")).toContainText(`${code}B`);
  await expect(page.getByTestId("import-problems")).toContainText("ไม่ระบุผู้สอน");
  const detail = (await (await request.get(`${API}/courses/${course.id}`, { headers: { Authorization: `Bearer ${staffToken}` } })).json()).course;
  expect(detail.sections).toHaveLength(1);
  expect(detail.sections[0].maxStudents).toBe(30);
});
