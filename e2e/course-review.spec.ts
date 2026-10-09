import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function token(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token as string;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

// owner decision 9/10/69 (G4 รอง a): staff see the waiting courses, send one back with a reason or approve it;
// the lecturer sees the reason and sends it again
test("staff send a waiting course back, the lecturer sends it again, staff approve it", async ({ page, request, browser }) => {
  const narin = { Authorization: `Bearer ${await token(request, "narin@showpro.local")}` };
  const code = `RV${Date.now().toString(36).toUpperCase()}`;
  const year = "2500"; // a past term, like the other specs, so it never becomes the default term anywhere
  const created = await request.post(`${API}/courses`, { headers: narin, data: {
    code, name: "Review flow", nameThai: "วิชาทดสอบอนุมัติ", credits: 3, semester: 1, academicYear: year, year: 2,
    lecturerId: "ignored-for-lecturers", sections: [{ number: "01", maxStudents: 20, schedule: [] }],
  } });
  expect(created.status()).toBe(201);

  // staff: the queue from the notification link
  await login(page, "staff@showpro.local");
  await page.goto("/courses?status=pending");
  const card = page.getByTestId("course-card").filter({ hasText: code });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("course-card").filter({ hasNotText: /รออนุมัติ|Pending/ })).toHaveCount(0);
  await card.getByRole("button", { name: /ตีกลับ|Send back/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: /ยืนยันตีกลับ|Send back/ })).toBeDisabled();
  await dialog.getByLabel(/เหตุผล|Reason/).fill("ขอเพิ่มคำอธิบายรายวิชา");
  await dialog.getByRole("button", { name: /ยืนยันตีกลับ|Send back/ }).click();
  await expect(page.getByTestId("course-card").filter({ hasText: code })).toHaveCount(0);

  // lecturer: sees why, sends it again
  const lecturer = await browser.newPage();
  await login(lecturer, "narin@showpro.local");
  await lecturer.goto("/courses");
  const mine = lecturer.getByTestId("course-card").filter({ hasText: code });
  await expect(mine).toContainText("ถูกตีกลับ");
  await expect(mine).toContainText("ขอเพิ่มคำอธิบายรายวิชา");
  await mine.getByRole("button", { name: /ส่งให้อนุมัติอีกครั้ง|Send again/ }).click();
  await expect(mine).toContainText("รออนุมัติ");
  await lecturer.close();

  // staff: approve
  await page.reload();
  const again = page.getByTestId("course-card").filter({ hasText: code });
  await again.getByRole("button", { name: /^อนุมัติ$|^Approve$/ }).click();
  await expect(page.getByTestId("course-card").filter({ hasText: code })).toHaveCount(0);
  await page.goto("/courses");
  await expect(page.getByTestId("course-card").filter({ hasText: code }).getByTestId("course-card-status")).toHaveText(/เปิดใช้งาน|Active/);
});
