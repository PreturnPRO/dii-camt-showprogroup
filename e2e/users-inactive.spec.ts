import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function token(request: APIRequestContext, email: string, password = "Password123!") {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password } })).json()).token as string;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/** a fresh imported student with distinct English and Thai names */
async function freshStudent(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const email = `e2e-inactive-${stamp}@example.com`;
  const res = await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `66${String(stamp).slice(-7)}`, name: `Inactive English ${stamp}`, nameThai: `นักศึกษา ระงับ ${stamp}`, email, major: "DII", program: "DII", year: 1, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } });
  expect(res.ok()).toBeTruthy();
  const users = (await (await request.get(`${API}/users?q=${encodeURIComponent(email)}`, { headers: staff })).json()).users as Array<{ id: string }>;
  return { staff, email, stamp, id: users[0].id };
}

test("a suspended account can be found and reactivated from the Users page", async ({ page, request }) => {
  const s = await freshStudent(request);
  expect((await request.patch(`${API}/users/${s.id}`, { headers: s.staff, data: { isActive: false } })).ok()).toBeTruthy();

  await login(page, "admin@showpro.local");
  await page.goto("/users");
  await page.getByTestId("show-inactive").click();
  await page.getByPlaceholder(/ค้นหา|search/i).fill(s.email);
  const row = page.getByTestId("user-row").filter({ hasText: s.email });
  await expect(row).toContainText(/ระงับ|Inactive/);
  await row.getByRole("button", { name: /แก้ไข|edit/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").filter({ hasText: /Inactive|ระงับ/ }).click();
  await page.getByRole("option", { name: /Active/ }).first().click();
  await dialog.getByRole("button", { name: /บันทึก|save/i }).click();
  await expect(dialog).toBeHidden();

  const login2 = await request.post(`${API}/auth/login`, { data: { email: s.email, password: "Temp-Pass-123!" } });
  expect(login2.status()).toBe(200);
});

test("editing a user and saving keeps their English name", async ({ page, request }) => {
  const s = await freshStudent(request);
  await login(page, "admin@showpro.local");
  await page.goto("/users");
  await page.getByPlaceholder(/ค้นหา|search/i).fill(s.email);
  const row = page.getByTestId("user-row").filter({ hasText: s.email });
  await row.getByRole("button", { name: /แก้ไข|edit/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /บันทึก|save/i }).click();
  await expect(dialog).toBeHidden();
  const user = (await (await request.get(`${API}/users?q=${encodeURIComponent(s.email)}`, { headers: s.staff })).json()).users[0];
  expect(user.name).toBe(`Inactive English ${s.stamp}`);
  expect(user.nameThai).toBe(`นักศึกษา ระงับ ${s.stamp}`);
});

test("user row action buttons have names", async ({ page }) => {
  await login(page, "admin@showpro.local");
  await page.goto("/users");
  const row = page.getByTestId("user-row").first();
  await expect(row.getByRole("button", { name: /แก้ไข|edit/i })).toBeVisible();
  await expect(row.getByRole("button", { name: /ลบ|delete/i })).toBeVisible();
});
