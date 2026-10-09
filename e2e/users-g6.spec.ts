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
const staffAuth = async (request: APIRequestContext) =>
  ({ Authorization: `Bearer ${(await (await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } })).json()).token}` });

// G6 (staff ST-M2, M-N1): a registrar export has no student email and an "Advisor Email" column;
// a row that cannot go in says which row and why
test("importing a registrar export: the advisor column is the advisor, and a failed row gives its reason", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/users");
  await page.getByRole("button", { name: "Import นักศึกษา" }).click();
  const dialog = page.getByRole("dialog", { name: "Import รายชื่อนักศึกษา" });
  const stamp = Date.now();
  const good = `64${String(stamp).slice(-7)}`;
  const bad = `65${String(stamp).slice(-7)}`;
  const csv = `studentId,name,Advisor Email,year,academicYear\n${good},Registrar One,mali@showpro.local,1,2569\n${bad},Registrar Two,nobody-${stamp}@example.com,1,2569\n`;
  await dialog.locator("input[type=file]").setInputFiles({ name: "registrar.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await dialog.getByRole("button", { name: /^Import 2 รายการ$/ }).click();
  const temp = page.getByRole("dialog", { name: /รหัสผ่านชั่วคราว/ });
  await expect(temp).toBeVisible({ timeout: 15_000 });
  await expect(temp).toContainText(`${good}@student.showpro.local`);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("user-import-problems")).toContainText(`แถว 3 (${bad}): อีเมลอาจารย์ที่ปรึกษาไม่ตรงกับอาจารย์ในระบบ`);
});

// G6 (staff ST-M1, ST-M3): find a student by ID or English name, and an edited ID is really saved
test("staff find a student by ID or English name and change the ID", async ({ page, request }) => {
  const staff = await staffAuth(request);
  const stamp = Date.now();
  const studentId = `66${String(stamp).slice(-7)}`;
  const english = `Searchable${stamp}`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId, name: english, nameThai: `นักศึกษา ค้นหา ${stamp}`, email: `e2e-g6-${stamp}@example.com`, major: "DII", program: "DII", year: 1, semester: 1, academicYear: "2569",
  }] } })).ok()).toBeTruthy();

  await login(page, "staff@showpro.local");
  await page.goto("/users");
  const search = page.getByPlaceholder(/ค้นหา|search/i);
  await search.fill(studentId);
  await expect(page.getByTestId("user-row")).toHaveCount(1);
  await search.fill(english.toLowerCase());
  const row = page.getByTestId("user-row").filter({ hasText: `e2e-g6-${stamp}@example.com` });
  await expect(row).toHaveCount(1);

  const next = `67${String(stamp).slice(-7)}`;
  await row.getByRole("button", { name: /แก้ไข|edit/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("รหัสนักศึกษา *").fill(next);
  await dialog.getByRole("button", { name: /บันทึก|save/i }).click();
  await expect(dialog).toBeHidden();
  const users = (await (await request.get(`${API}/users?q=${encodeURIComponent(`e2e-g6-${stamp}@example.com`)}`, { headers: staff })).json()).users;
  expect(JSON.stringify(users[0])).toContain(next);
});
