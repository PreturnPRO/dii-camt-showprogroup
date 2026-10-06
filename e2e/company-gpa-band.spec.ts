import { expect, test } from "@playwright/test";

test("a company sees applicants' GPA bands, never their exact GPA", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "talent@northernsoft.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  // seed applicants: alice GPAX 3.74, bob GPAX 3.31 (the dashboard lists none until someone is pending)
  await page.goto("/applicants");
  await expect(page.locator("main").getByText(/3\.50\+|3\.00-3\.49/).first()).toBeVisible();
  await expect(page.locator("main").getByText(/3\.74|3\.31/)).toHaveCount(0);
});

test("staff pages show cumulative GPAX, not the current-term GPA", async ({ page }) => {
  // a student with nothing graded this term (gpa 0) but a real cumulative GPAX of 3.50
  await page.route("**/api/students", async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.students = (body.students ?? []).map((s: Record<string, unknown>, i: number) => (i === 0 ? { ...s, gpa: 0, gpax: 3.5 } : s));
    await route.fulfill({ response: res, json: body });
  });
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "staff@showpro.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/students");
  await expect(page.locator("main").getByText(/GPAX 3\.50/).first()).toBeVisible();
  await expect(page.locator("main").getByText(/GPA 0\.00/)).toHaveCount(0);
});
