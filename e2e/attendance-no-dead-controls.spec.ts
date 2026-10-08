import { expect, test } from "@playwright/test";

test("attendance has no dead buttons, invented periods or a fixed 'last saved' time", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "narin@showpro.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/attendance");
  await page.waitForLoadState("networkidle");
  const main = page.locator("main");
  await expect(main.getByText("09:00 - 12:00 (Lecture)")).toHaveCount(0);
  await expect(main.getByText(/บันทึกล่าสุด: วันนี้ 09:15/)).toHaveCount(0);
  await expect(main.getByRole("button", { name: "เริ่มเช็คชื่อ" })).toHaveCount(0);
  await expect(main.getByRole("button", { name: "บันทึกข้อมูล" })).toHaveCount(0);
  // what replaces the save button: say that each click is saved
  await expect(main.getByText("กดสถานะแล้วบันทึกทันที")).toBeVisible();
});
