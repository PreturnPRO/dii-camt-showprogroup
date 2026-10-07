import { expect, test } from "@playwright/test";

// there is no self-registration: staff create accounts (add user / import) and hand out temporary passwords
test("/register sends visitors to the login page", async ({ page }) => {
  await page.goto("/register");
  await page.waitForURL("**/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
});

for (const path of ["/", "/login"]) {
  test(`${path} offers no link to register`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator('a[href="/register"]')).toHaveCount(0);
  });
}
