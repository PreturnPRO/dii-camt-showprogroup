import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

// the layout used to mount every page twice (a hidden desktop tree and a hidden mobile tree),
// which doubled every API call and duplicated every control on the page
for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`one page tree at ${viewport.width}px: one <main>, one stats request`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, "alice@student.showpro.local");
    let statsCalls = 0;
    page.on("request", (r) => { if (/\/api\/students\/stats$/.test(r.url())) statsCalls += 1; });
    await page.goto("/grades");
    await expect(page.getByTestId("gpax").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByTestId("gpax")).toHaveCount(1);
    expect(statsCalls).toBe(1);
  });
}
