import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("login page offers no Google/Microsoft sign-in", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /^(เข้าสู่ระบบ|log ?in|sign in)$/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Google" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Microsoft" })).toHaveCount(0);
  await expect(page.getByText(/หรือดำเนินการต่อด้วย|or continue with/i)).toHaveCount(0);
});

test("header has no search box or ⌘K hint", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "alice@student.showpro.local");
  const header = page.locator("header").first();
  await expect(header.getByTestId("notification-bell")).toBeVisible();
  await expect(header.getByPlaceholder(/ค้นหา\.\.\.|Search\.\.\./)).toHaveCount(0);
  await expect(header.getByText("⌘K")).toHaveCount(0);
});

test("admin dashboard has no backup button or fixed backup badge", async ({ page }) => {
  await login(page, "admin@showpro.local");
  await expect(page.getByText("Database", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^Backup$/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /สำรองข้อมูล|Data Backup/ })).toHaveCount(0);
});

test("lecturer workload page has no download TOR button", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.goto("/workload");
  await expect(page.getByText(/ภาระงาน|Workload/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /TOR/ })).toHaveCount(0);
});

test("settings has no notification switches and no fake 'Active' button", async ({ page }) => {
  await login(page, "alice@student.showpro.local");
  await page.goto("/settings");
  const main = page.locator("main");
  await expect(main.getByRole("button", { name: /^(ข้อมูลโปรไฟล์|Profile Information)$/ })).toBeVisible({ timeout: 15_000 });
  await expect(main.getByRole("button", { name: /^(การแจ้งเตือน|Notifications)$/ })).toHaveCount(0);
  // the only switch is the real data-sharing consent for the CV (it saves to the server)
  await expect(main.getByRole("switch")).toHaveCount(1);
  await expect(page.getByTestId("cv-sharing").getByRole("switch")).toHaveCount(1);

  await main.getByRole("button", { name: /^(ความปลอดภัย|Security)$/ }).click();
  await expect(page.getByTestId("security-active")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Active$/ })).toHaveCount(0);
});
