import { expect, test, type Page } from "@playwright/test";
import { API } from "./env";


async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("student pages show the student's real term, never a hard-coded one", async ({ page, request }) => {
  await login(page, "alice@student.showpro.local");
  const tokenValue = await page.evaluate(() => sessionStorage.getItem("xchange_auth_token") ?? localStorage.getItem("xchange_auth_token"));
  const summary = (await (await request.get(`${API}/enrollments/summary`, { headers: { Authorization: `Bearer ${tokenValue}` } })).json()).summary;
  const term = `${summary.semester}/${summary.academicYear}`;
  for (const path of ["/schedule", "/courses"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").getByText(/1\/2567|1\/2568/)).toHaveCount(0);
    await expect(page.locator("main").getByText(`ภาคเรียนที่ ${term}`).first()).toBeVisible();
  }
  await page.goto("/grades");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").getByText(/1\/2567|1\/2568/)).toHaveCount(0);
});

for (const email of ["narin@showpro.local", "staff@showpro.local"]) {
  test(`${email.split("@")[0]}'s courses page shows no hard-coded term`, async ({ page }) => {
    await login(page, email);
    await page.goto("/courses");
    // the page has to show the courses first, or a blank or failed page would pass
    await expect(page.locator("main").getByText("DII340").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main").getByText(/1\/2567|1\/2568/)).toHaveCount(0);
  });
}

test("internship stat cards say what they count", async ({ page }) => {
  await login(page, "alice@student.showpro.local");
  await page.goto("/internships");
  await expect(page.getByTestId("job-card").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("main").getByText(/คัดสรรตามทักษะคุณ|นักศึกษาที่ได้งาน/)).toHaveCount(0);
});
