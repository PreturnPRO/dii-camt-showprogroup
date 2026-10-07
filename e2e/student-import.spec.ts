import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

// with self-registration closed, staff import is how students get accounts
test("staff imports a student list and gets each new student's temporary password", async ({ page, request }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/users");
  await page.getByRole("button", { name: "Import นักศึกษา" }).click();
  const dialog = page.getByRole("dialog", { name: "Import รายชื่อนักศึกษา" });
  await expect(dialog).toBeVisible();

  const stamp = Date.now();
  const studentId = `69${String(stamp).slice(-7)}`;
  const email = `e2e-imp-${stamp}@example.com`;
  const csv = `studentId,name,nameThai,email,year,academicYear\n${studentId},Imported Student,นักศึกษา นำเข้า,${email},1,2569\n`;
  await dialog.locator("input[type=file]").setInputFiles({ name: "students.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await dialog.getByRole("button", { name: /^Import 1 รายการ$/ }).click();

  const creds = page.getByRole("dialog", { name: /รหัสผ่านชั่วคราว/ });
  await expect(creds).toBeVisible({ timeout: 15_000 });
  await expect(creds).toContainText(email);
  const temp = (await creds.getByTestId("temp-password").first().innerText()).trim();
  const res = await request.post(`${API}/auth/login`, { data: { email, password: temp } });
  expect(res.status()).toBe(200);
});

test("students cannot open the Users page (and so cannot import)", async ({ page }) => {
  await login(page, "alice@student.showpro.local");
  await page.goto("/users");
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("button", { name: "Import นักศึกษา" })).toHaveCount(0);
});
