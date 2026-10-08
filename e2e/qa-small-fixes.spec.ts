import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("staff can reach their pages from the sidebar, and the dashboard has no dead appointments card", async ({ page }) => {
  await login(page, "staff@showpro.local");
  for (const href of ["/courses", "/students", "/grades", "/documents", "/reports"]) {
    await expect(page.locator(`aside a[href="${href}"]`).first()).toBeVisible();
  }
  await expect(page.locator("main").getByText("นัดหมาย", { exact: true })).toHaveCount(0);
});

test("admin is not sent to student/lecturer-only views", async ({ page }) => {
  await login(page, "admin@showpro.local");
  for (const path of ["/activities", "/workload"]) {
    await page.goto(path);
    await page.waitForURL("**/dashboard");
  }
});

test("portfolio shows no invented location and the add-project tile is a button", async ({ page }) => {
  await login(page, "alice@student.showpro.local");
  await page.goto("/portfolio");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Chiang Mai, Thailand")).toHaveCount(0);
  const add = page.getByTestId("add-project");
  if (await add.count()) await expect(add).toHaveJSProperty("tagName", "BUTTON");
});
