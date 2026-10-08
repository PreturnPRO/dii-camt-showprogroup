import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("intern tracking renders without an update loop", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await login(page, "staff@showpro.local");
  await page.goto("/intern-tracking");
  await page.waitForLoadState("networkidle");
  expect(errors.filter((e) => e.includes("Maximum update depth"))).toEqual([]);
});

test("a failed intern list is an error, not 'no interns', and does not loop", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await login(page, "staff@showpro.local");
  await page.route("**/api/internship**", (route) => route.request().method() === "GET" ? route.fulfill({ status: 500, body: "{}" }) : route.continue());
  await page.goto("/intern-tracking");
  await expect(page.getByTestId("interns-load-error")).toBeVisible({ timeout: 15_000 });
  expect(errors.filter((e) => e.includes("Maximum update depth"))).toEqual([]);
});
