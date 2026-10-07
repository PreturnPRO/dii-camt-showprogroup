import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function apiLogin(request: APIRequestContext, email: string, password = "Password123!") {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.status()).toBe(200);
  return (await res.json()).token as string;
}
const meStatus = async (request: APIRequestContext, token: string) =>
  (await request.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).status();

async function uiLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("logging out in the browser ends only this device's session", async ({ page, request }) => {
  const otherDevice = await apiLogin(request, "alice@student.showpro.local");
  await uiLogin(page, "alice@student.showpro.local", "Password123!");
  const thisDevice = await page.evaluate(
    () => sessionStorage.getItem("xchange_auth_token") ?? localStorage.getItem("xchange_auth_token"),
  );
  await page.getByRole("button", { name: /alice/i }).first().click();
  await page.getByRole("menuitem", { name: /ออกจากระบบ|log ?out/i }).click();
  await page.waitForURL(/\/login|\/$/);
  expect(await meStatus(request, thisDevice as string)).toBe(401);
  expect(await meStatus(request, otherDevice)).toBe(200);
});

test("changing the temporary password keeps this browser signed in and signs out other devices", async ({ page, request }) => {
  const staff = await apiLogin(request, "staff@showpro.local");
  const email = `e2e-sess-${Date.now()}@example.com`;
  const created = await request.post(`${API}/users`, {
    headers: { Authorization: `Bearer ${staff}` },
    data: { email, name: "Sess E2E", nameThai: "เซสชัน ทดสอบ", role: "LECTURER", profile: { lecturerId: `LE2E${Date.now()}`, department: "DII", position: "x" } },
  });
  expect(created.status()).toBe(201);
  const temp = (await created.json()).temporaryPassword as string;
  const otherDevice = await apiLogin(request, email, temp);

  await uiLogin(page, email, temp);
  const dialog = page.getByRole("dialog", { name: "ตั้งรหัสผ่านใหม่" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("รหัสผ่านชั่วคราว").fill(temp);
  await dialog.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("NewSecret123!");
  await dialog.getByLabel("ยืนยันรหัสผ่านใหม่").fill("NewSecret123!");
  await dialog.getByRole("button", { name: "บันทึกรหัสผ่าน" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("dialog", { name: "ตั้งรหัสผ่านใหม่" })).toHaveCount(0);
  expect(await meStatus(request, otherDevice)).toBe(401);
});
