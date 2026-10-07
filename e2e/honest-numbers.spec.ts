import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("no skill scores are shown: the skills tab and the soft-skill card are gone (owner decision 7/10/69)", async ({ page }) => {
  // alice has a lecturer rubric in the seed; it must not appear anywhere
  await login(page, "alice@student.showpro.local");
  await expect(page.getByRole("tab", { name: /ภาพรวม|Overview/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /ทักษะ|Skills/ })).toHaveCount(0);
  await page.goto("/personal-dashboard");
  await expect(page.getByText(/ความก้าวหน้าของหลักสูตร|Degree Progress/).first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/Soft Skills|ประเมินตัวเอง|คะแนนจากอาจารย์/);
});

test("curriculum progress counts against the whole curriculum, without invented categories", async ({ page, request }) => {
  await login(page, "chompoo@student.showpro.local");
  const token = await page.evaluate(() => sessionStorage.getItem("showpro_auth_token") ?? localStorage.getItem("showpro_auth_token"));
  const stats = (await (await request.get("http://localhost:4000/api/students/stats", { headers: { Authorization: `Bearer ${token}` } })).json()).stats;
  await page.getByRole("tab", { name: /ตารางเรียน|Schedule/ }).click();
  await expect(page.getByTestId("credits-required")).toContainText(String(stats.curriculumProgress.requiredCredits));
  await expect(page.getByTestId("credits-completed")).toContainText(String(stats.curriculumProgress.completedCredits));
  // two sources, both labelled: the registrar figure and the one counted from courses in the system
  await expect(page.getByTestId("credits-source")).toContainText(/จากรายวิชาในระบบ|courses in the system/);
  await expect(page.getByTestId("credits-registrar")).toContainText(`${stats.earnedCredits}`);
  await expect(page.getByTestId("credits-registrar")).toContainText(/ตามทะเบียน|registrar/i);
  await expect(page.locator("[role=tabpanel]")).not.toContainText(/GE คณะ|ตัวฟรี|Distinction|Excellent/);
});

test("the portfolio shows no invented completeness and skill levels as levels, not percentages", async ({ page }) => {
  // alice has skills in the seed
  await login(page, "alice@student.showpro.local");
  await page.goto("/portfolio");
  await expect(page.getByTestId("skill-level").first()).toBeVisible();
  await expect(page.getByText("95%")).toHaveCount(0);
  for (const label of await page.getByTestId("skill-level").allTextContents()) expect(label).not.toContain("%");
});

test("the lecturer workload page uses the real term, timetable and advisee count", async ({ page, request }) => {
  await login(page, "narin@showpro.local");
  const token = await page.evaluate(() => sessionStorage.getItem("showpro_auth_token") ?? localStorage.getItem("showpro_auth_token"));
  const lecturer = (await (await request.get("http://localhost:4000/api/courses/lecturer/schedule", { headers: { Authorization: `Bearer ${token}` } })).json()).lecturer;
  await page.goto("/workload");
  await expect(page.getByTestId("workload-advisees")).toHaveText(String(lecturer.advisees.length));
  await expect(page.locator("main")).not.toContainText("1/2568");
});

test("staff workload tracking shows real advisee counts and no invented overload verdict", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/workload-tracking");
  await expect(page.getByTestId("workload-row").first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/ADV-|เกินเกณฑ์|Over limit|Overloaded/);
});

test("average GPA leaves out students without grades and says how many it counts", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/reports");
  await expect(page.getByTestId("avg-gpa-count")).toContainText(/จาก \d+ คนที่มีเกรด|from \d+ students with grades/);
});

test("the public pages make no unsourced claims", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /เข้าสู่ระบบ|Log ?in|Sign in/i }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/5,000\+|200\+|98%|4\.9\/5|AXONS|สมศักดิ์|60%/);
  await page.goto("/privacy-policy");
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/ISO 27001|PDPA Compliant|AES/);
});

test("a lecturer without a workload record sees dashes, not zeros", async ({ page }) => {
  await page.route("**/api/workload", (route) => route.fulfill({ json: { success: true, workload: [] } }));
  await login(page, "narin@showpro.local");
  await page.goto("/workload");
  await expect(page.getByTestId("workload-teaching")).toHaveText("-");
  await expect(page.getByText(/ยังไม่มีบันทึกภาระงาน|No workload records/)).toBeVisible();
});

test("workload tracking counts lecturers, not records", async ({ page }) => {
  const row = (id: string, semester: number) => ({ id, lecturerId: "L1", academicYear: "2569", semester, teachingHours: 9, researchHours: 0, advisingHours: 0, serviceHours: 0,
    lecturer: { id: "L1", user: { name: "Narin", nameThai: "นรินทร์" }, _count: { advisees: 2 } } });
  await page.route("**/api/workload", (route) => route.fulfill({ json: { success: true, workload: [row("w1", 1), row("w2", 2)] } }));
  await login(page, "staff@showpro.local");
  await page.goto("/workload-tracking");
  await expect(page.getByTestId("workload-row")).toHaveCount(2);
  await expect(page.getByTestId("workload-lecturers")).toHaveText("1");
});
