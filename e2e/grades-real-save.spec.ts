import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const CRITERIA = ["Midterm", "Final", "Assignments", "Participation", "Project"];

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

/** a fresh student (grading a seed student would rewrite their GPAX), password already changed */
async function freshStudent(request: APIRequestContext, staff: Record<string, string>) {
  const stamp = Date.now();
  const email = `e2e-grade-${stamp}@example.com`;
  const res = await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `67${String(stamp).slice(-7)}`, name: "Grade Student", nameThai: "นักศึกษา เกรด", email, major: "DII", program: "DII", year: 1, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } });
  expect(res.ok()).toBeTruthy();
  const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
  expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: "Password123!" } })).ok()).toBeTruthy();
  const auth = { Authorization: `Bearer ${await token(request, email)}` };
  const profile = (await (await request.get(`${API}/students/profile`, { headers: auth })).json()).profile as { id: string };
  return { email, profileId: profile.id };
}

test("a lecturer's grade sheet really saves, and the student sees every criterion", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers as Array<{ id: string; user: { email: string } }>;
  const narin = lecturers.find((l) => l.user.email === "narin@showpro.local")!;
  const code = `GR${Date.now().toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 3, semester: 1, academicYear: "2569", year: 1, lecturerId: narin.id, status: "active",
    sections: [{ number: "01", maxStudents: 5, schedule: [{ day: "monday", startTime: "08:00", endTime: "09:00" }] }],
    gradingCriteria: CRITERIA.map((name, orderIndex) => ({ name, weightPercentage: 20, maxScore: 100, orderIndex })),
  } });
  expect(created.ok()).toBeTruthy();
  const course = (await created.json()).course as { id: string; sections: Array<{ id: string }> };
  const student = await freshStudent(request, staff);
  expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: student.profileId, courseId: course.id, sectionId: course.sections[0].id } })).ok()).toBeTruthy();

  try {
    await login(page, "narin@showpro.local");
    await page.goto("/grades");
    await page.getByTestId("grade-course-filter").selectOption(course.id);
    const row = page.getByTestId("grade-row").filter({ hasText: "นักศึกษา เกรด" });
    await expect(row).toHaveCount(1);
    // an empty grade box must not look like a real grade
    await expect(row.getByTestId("grade-letter")).not.toHaveAttribute("placeholder", "A");
    for (let i = 0; i < CRITERIA.length; i++) await row.getByTestId(`grade-score-${i}`).fill("80");

    const saved = page.waitForResponse((r) => r.url().endsWith("/api/grades/bulk") && r.request().method() !== "GET");
    await page.getByRole("button", { name: /บันทึกคะแนน|save grades/i }).click();
    expect((await saved).status()).toBe(200);

    await page.reload();
    await page.getByTestId("grade-course-filter").selectOption(course.id);
    for (let i = 0; i < CRITERIA.length; i++) {
      await expect(page.getByTestId("grade-row").filter({ hasText: "นักศึกษา เกรด" }).getByTestId(`grade-score-${i}`)).toHaveValue("80");
    }

    // the student's card shows all five criteria, not the first three
    await page.context().clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await login(page, student.email);
    await page.goto("/grades");
    const card = page.getByTestId("grade-card").filter({ hasText: code });
    for (const name of CRITERIA) await expect(card).toContainText(name, { ignoreCase: true });
    await expect(page.getByText(/เป้าหมาย|Target/)).toHaveCount(0);
  } finally {
    await request.patch(`${API}/courses/${course.id}`, { headers: staff, data: { academicYear: "2500" } });
  }
});
