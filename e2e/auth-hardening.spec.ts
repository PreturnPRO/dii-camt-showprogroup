import { expect, test } from "@playwright/test";

const API = "http://localhost:4000/api";

test("register page offers only the student option", async ({ page }) => {
  await page.goto("/register");
  // wait for the real form (the app shows a full-screen preloader first), so the negative checks are not vacuous
  await expect(page.locator('input[type=email]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /สมัคร|register|sign up/i }).last()).toBeVisible();
  await expect(page.getByText(/staff|เจ้าหน้าที่/i)).toHaveCount(0);
  await expect(page.getByText(/lecturer|อาจารย์/i)).toHaveCount(0);
});

test("login page has no company phone mode", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type=password]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /^company$/i })).toHaveCount(0);
  await expect(page.locator('input[type=tel]')).toHaveCount(0);
});

test("a staff-created lecturer must change the temporary password before using the app", async ({ page, request }) => {
  const staffLogin = await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } });
  const staffToken = (await staffLogin.json()).token;
  const email = `e2e-lec-${Date.now()}@example.com`;
  const created = await request.post(`${API}/users`, {
    headers: { Authorization: `Bearer ${staffToken}` },
    data: { email, name: "E2E Lecturer", nameThai: "อาจารย์ทดสอบ", role: "LECTURER", profile: { lecturerId: `E${Date.now()}`, department: "DII", position: "Lecturer" } },
  });
  const temp = (await created.json()).temporaryPassword as string;

  await page.goto("/login");
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', temp);
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: /ตั้งรหัสผ่านใหม่/ });
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("รหัสผ่านชั่วคราว").fill(temp);
  await dialog.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("NewLecturer123!");
  await dialog.getByLabel("ยืนยันรหัสผ่านใหม่").fill("NewLecturer123!");
  await dialog.getByRole("button", { name: "บันทึกรหัสผ่าน" }).click();
  await expect(dialog).toBeHidden();
});

test("staff does not see the staff role or role change controls on the Users page", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type=email]', "staff@showpro.local");
  await page.fill('input[type=password]', "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/users");
  // Biw's Users page: "add new" opens a per-role menu; each role has its own dialog with no role switch
  await page.getByRole("button", { name: /เพิ่มผู้ใช้ใหม่|add new/i }).first().click();
  await expect(page.getByRole("menuitem", { name: /นักศึกษา|student/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /^(staff|เจ้าหน้าที่)$/i })).toHaveCount(0);
});
