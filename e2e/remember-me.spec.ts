import { expect, test, type Page } from "@playwright/test";

const TOKEN_KEY = "xchange_auth_token";

async function login(page: Page, email: string, remember: boolean) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  const box = page.getByRole("checkbox", { name: /จดจำฉัน|remember me/i });
  await expect(box).toBeVisible();
  if (remember) await box.check();
  await expect(box).toHaveAttribute("data-state", remember ? "checked" : "unchecked");
  await page.getByRole("button", { name: /^(เข้าสู่ระบบ|log ?in|sign in)$/i }).click();
  await page.waitForURL("**/dashboard");
}

const tokens = (page: Page) =>
  page.evaluate((key) => ({ local: localStorage.getItem(key), session: sessionStorage.getItem(key) }), TOKEN_KEY);

test("without 'remember me' the session lasts only for this tab", async ({ page, context }) => {
  const socketErrors: string[] = [];
  page.on("console", (m) => { if (/Realtime connection failed/.test(m.text())) socketErrors.push(m.text()); });

  await login(page, "alice@student.showpro.local", false);
  const stored = await tokens(page);
  expect(stored.session).toBeTruthy();
  expect(stored.local).toBeNull();

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("button", { name: /alice/i }).first()).toBeVisible({ timeout: 15_000 });
  expect(socketErrors).toEqual([]);

  // a new tab does not share sessionStorage → it is a fresh, logged-out visit
  const other = await context.newPage();
  await other.goto("/dashboard");
  await other.waitForURL("**/login**", { timeout: 15_000 });
});

test("with 'remember me' the session survives into a new tab, and logout clears it everywhere", async ({ page, context }) => {
  await login(page, "alice@student.showpro.local", true);
  const stored = await tokens(page);
  expect(stored.local).toBeTruthy();
  expect(stored.session).toBeNull();

  const other = await context.newPage();
  await other.goto("/dashboard");
  await expect(other.getByRole("button", { name: /alice/i }).first()).toBeVisible({ timeout: 15_000 });
  await expect(other).toHaveURL(/\/dashboard/);
  await other.close();

  await page.getByRole("button", { name: /alice/i }).first().click();
  await page.getByRole("menuitem", { name: /ออกจากระบบ|log ?out/i }).click();
  await expect.poll(() => tokens(page)).toEqual({ local: null, session: null });
});
