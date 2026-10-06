import { expect, test } from "@playwright/test";

test("a rejected grade batch tells the lecturer which rows are wrong", async ({ page }) => {
  await page.route("**/api/grades/bulk", (route) =>
    route.fulfill({
      status: 400,
      json: {
        success: false,
        message: "Some grade rows are invalid; nothing was saved",
        details: { rows: [{ index: 0, studentId: "x", message: "Score 105 is above the maximum 100 for Midterm" }] },
      },
    }),
  );
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "narin@showpro.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/grades");
  await page.getByRole("button", { name: /บันทึก|save/i }).first().click();
  await expect(page.getByText("Score 105 is above the maximum 100 for Midterm").first()).toBeVisible();
});
