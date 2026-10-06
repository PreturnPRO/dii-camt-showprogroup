import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("a student sees what they joined, their real points, and no check-in button", async ({ page, request }) => {
  const calls: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/api/")) calls.push(r.url()); });
  await login(page, "bob@student.showpro.local");
  const token = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const stats = await (await request.get("http://localhost:4000/api/students/stats", { headers: { Authorization: `Bearer ${token}` } })).json();

  await page.goto("/activities");
  await page.waitForLoadState("networkidle");
  const main = page.locator("main");
  await expect(main.getByText("ลงทะเบียนแล้ว").first()).toBeVisible();
  // the value right under the "total points" label, exactly — not any "10" on the page
  const pointsValue = main.locator("p", { hasText: "แต้มสะสมทั้งหมด" }).locator("xpath=following-sibling::h3[1]");
  await expect(pointsValue).toHaveText(String(stats.stats.gamificationPoints));
  await expect(main.getByRole("button", { name: /ดูอันดับทั้งหมด|view all/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /check in|เช็คอิน/i })).toHaveCount(0);
  await expect(main.getByText("Activity Master")).toHaveCount(0);
  // stat tiles had invented levels/targets with no data behind them
  await expect(main.getByText(/Level 12 Explorer|เหลืออีก 2 เพื่อปลดล็อค|เป้าหมายเทอมนี้/)).toHaveCount(0);
  expect(calls.some((u) => u.includes("/player/stats"))).toBe(false);
});

test("a student without badges is told so instead of seeing placeholder icons", async ({ page }) => {
  await login(page, "bob@student.showpro.local");
  await page.goto("/activities");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").getByText(/🚀|🎯|💎/)).toHaveCount(0);
  await expect(page.locator("main").getByText("ยังไม่มี badge")).toBeVisible();
});

test("the history tab lists only activities the student actually joined", async ({ page }) => {
  // chompoo joined nothing in the seed, while both seed activities have already ended
  await login(page, "chompoo@student.showpro.local");
  await page.goto("/activities");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: /ประวัติกิจกรรม|history/i }).click();
  const main = page.locator("main");
  // the panel animates in, so assert the positive empty state first (a bare toHaveCount(0) passes before it renders)
  await expect(main.getByText("ยังไม่มีประวัติกิจกรรมสะสม")).toBeVisible();
  await expect(main.getByText("registered", { exact: true })).toHaveCount(0);
});
