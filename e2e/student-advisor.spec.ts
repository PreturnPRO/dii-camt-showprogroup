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

test("staff give an imported student an advisor, and that lecturer sees the advisee", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const email = `e2e-advisor-${stamp}@example.com`;
  const nameThai = `นักศึกษา ที่ปรึกษา ${stamp}`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `65${String(stamp).slice(-7)}`, name: `Advisor E2E ${stamp}`, nameThai, email, major: "DII", program: "DII", year: 2, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers as Array<{ user: { email: string; nameThai: string } }>;
  const mali = lecturers.find((l) => l.user.email === "mali@showpro.local")!;

  await login(page, "staff@showpro.local");
  await page.goto("/users");
  await page.getByPlaceholder(/ค้นหา|search/i).fill(email);
  const row = page.getByTestId("user-row").filter({ hasText: email });
  await row.getByRole("button", { name: /แก้ไข|edit/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("อาจารย์ที่ปรึกษา")).toHaveText("ยังไม่มีอาจารย์ที่ปรึกษา");
  await dialog.getByLabel("อาจารย์ที่ปรึกษา").click();
  await page.getByRole("option", { name: mali.user.nameThai }).click();
  await dialog.getByRole("button", { name: /บันทึก|save/i }).click();
  await expect(dialog).toBeHidden();

  // reopening shows the saved advisor
  await row.getByRole("button", { name: /แก้ไข|edit/i }).click();
  await expect(page.getByRole("dialog").getByLabel("อาจารย์ที่ปรึกษา")).toHaveText(mali.user.nameThai);
  await page.getByRole("dialog").getByRole("button", { name: "ยกเลิก" }).click();

  const advisorPage = await page.context().browser()!.newPage();
  await login(advisorPage, "mali@showpro.local");
  await advisorPage.goto("/advisees");
  await expect(advisorPage.getByText(nameThai)).toBeVisible({ timeout: 15_000 });
  await advisorPage.close();
});
