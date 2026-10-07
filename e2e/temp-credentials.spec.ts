import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function uiLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.keyboard.press("Enter");
}

test("staff sees the temporary password after creating an account, and it works", async ({ page, request }) => {
  await uiLogin(page, "staff@showpro.local", "Password123!");
  await page.waitForURL("**/dashboard");
  await page.goto("/users");
  await page.getByRole("button", { name: /เพิ่มผู้ใช้ใหม่/ }).first().click();
  await page.getByRole("menuitem", { name: /นักศึกษา/ }).click();
  const form = page.getByRole("dialog", { name: /เพิ่มนักศึกษาใหม่/ });
  const stamp = Date.now();
  const email = `ui-stu-${stamp}@example.com`;
  await form.getByPlaceholder("652110001").fill(String(stamp).slice(-9));
  await form.getByPlaceholder("student@cmu.ac.th").fill(email);
  await form.getByPlaceholder("สมชาย ใจดี").fill("นักศึกษา ทดสอบ");
  await form.getByPlaceholder("Somchai Jaidee").fill("UI Student");
  await form.getByRole("button", { name: /^บันทึกข้อมูล$/ }).click();

  const creds = page.getByRole("dialog", { name: /รหัสผ่านชั่วคราว/ });
  await expect(creds).toBeVisible();
  await expect(creds).toContainText(email);
  const temp = (await creds.getByTestId("temp-password").first().innerText()).trim();
  expect(temp).toMatch(/^[A-Za-z0-9_-]{12}$/);

  const login = await request.post(`${API}/auth/login`, { data: { email, password: temp } });
  expect(login.status()).toBe(200);
});

test("staff can reset a user's password from the Users page and gets the new temporary password", async ({ page, request }) => {
  const staffToken = (await (await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } })).json()).token;
  const email = `ui-reset-${Date.now()}@example.com`;
  await request.post(`${API}/users`, {
    headers: { Authorization: `Bearer ${staffToken}` },
    data: { email, name: `Reset ${Date.now()}`, nameThai: "รีเซ็ต", role: "LECTURER", profile: { lecturerId: `R${Date.now()}`, department: "DII", position: "L" } },
  });

  await uiLogin(page, "staff@showpro.local", "Password123!");
  await page.waitForURL("**/dashboard");
  await page.goto("/users");
  const row = page.locator("div").filter({ hasText: email }).filter({ has: page.getByRole("button", { name: "รีเซ็ตรหัสผ่าน" }) }).last();
  await row.getByRole("button", { name: "รีเซ็ตรหัสผ่าน" }).click();

  const creds = page.getByRole("dialog", { name: /รหัสผ่านชั่วคราว/ });
  await expect(creds).toBeVisible();
  const temp = (await creds.getByTestId("temp-password").first().innerText()).trim();
  const login = await request.post(`${API}/auth/login`, { data: { email, password: temp } });
  expect(login.status()).toBe(200);
  expect((await login.json()).user.mustChangePassword).toBe(true);
});

test("the forced password dialog lets the user log out", async ({ page, request }) => {
  const staffToken = (await (await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } })).json()).token;
  const email = `ui-out-${Date.now()}@example.com`;
  const temp = (await (await request.post(`${API}/users`, {
    headers: { Authorization: `Bearer ${staffToken}` },
    data: { email, name: "Out", nameThai: "ออก", role: "LECTURER", profile: { lecturerId: `O${Date.now()}`, department: "DII", position: "L" } },
  })).json()).temporaryPassword as string;

  await uiLogin(page, email, temp);
  const dialog = page.getByRole("dialog", { name: /ตั้งรหัสผ่านใหม่/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "ออกจากระบบ" }).click();
  await page.waitForURL("**/login");
});
