import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}
async function adminToken(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, { data: { email: "admin@showpro.local", password: "Password123!" } });
  return (await res.json()).token as string;
}

let ruleId: string | undefined;
test.afterEach(async ({ request }) => {
  if (!ruleId) return;
  await request.delete(`${API}/automation-rules/${ruleId}`, { headers: { Authorization: `Bearer ${await adminToken(request)}` } });
  ruleId = undefined;
});

test("the automation page speaks Thai by default", async ({ page }) => {
  await login(page, "admin@showpro.local");
  await page.goto("/automation");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/ระบบอัตโนมัติ/);
  await expect(page.getByRole("button", { name: /สร้างกฎอัตโนมัติ/ })).toBeVisible();
});

test("staff cannot open the automation page (the API is admin-only)", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/automation");
  await page.waitForURL("**/dashboard");
});

test("deleting a rule asks first; cancelling keeps it", async ({ page, request }) => {
  const name = `E2E rule ${Date.now()}`;
  const created = await request.post(`${API}/automation-rules`, {
    headers: { Authorization: `Bearer ${await adminToken(request)}` },
    data: { name, description: "e2e", trigger: { type: "schedule", schedule: "0 8 * * *" }, action: { type: "notification", target: "STAFF", title: "t", titleThai: "t", message: "m", messageThai: "m" }, isActive: false },
  });
  expect(created.status()).toBe(201);
  ruleId = (await created.json()).rule.id;

  await login(page, "admin@showpro.local");
  await page.goto("/automation");
  const card = page.locator("[data-testid=automation-rule]", { hasText: name });
  await card.getByRole("button", { name: /ลบ/ }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: /ยกเลิก/ }).click();
  await expect(card).toBeVisible();
});

test("a JSON rule that is not valid JSON says so in plain words", async ({ page }) => {
  await login(page, "admin@showpro.local");
  await page.goto("/automation");
  await page.getByLabel(/ชื่อกฎ/).fill("bad json");
  await page.getByLabel(/คำอธิบาย/).fill("x");
  await page.getByRole("switch", { name: /JSON/ }).click();
  await page.getByLabel(/Trigger JSON/).fill("{not json");
  await page.getByRole("button", { name: /สร้างกฎอัตโนมัติ/ }).click();
  await expect(page.getByText(/JSON ไม่ถูกต้อง/)).toBeVisible();
});
