import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const PASSWORD = "Password123!";

async function token(request: APIRequestContext, email: string, password = PASSWORD) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token as string;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", PASSWORD);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/** A new lecturer and a new student (no seed data touched), both with their own password set. */
async function people(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const lecturerEmail = `e2e-lect-${stamp}@example.com`;
  const lecturerName = `อาจารย์ นัดหมาย ${stamp}`;
  const created = await request.post(`${API}/users`, { headers: staff, data: {
    name: `Lecturer ${stamp}`, nameThai: lecturerName, email: lecturerEmail, role: "LECTURER", password: "Temp-Pass-123!",
    profile: { department: "DII", position: "Lecturer" },
  } });
  expect(created.ok()).toBeTruthy();
  const studentEmail = `e2e-appt-${stamp}@example.com`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `60${String(stamp).slice(-7)}`, name: `Appt ${stamp}`, nameThai: `นักศึกษา นัด ${stamp}`, email: studentEmail, major: "DII", program: "DII", year: 2, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  for (const email of [lecturerEmail, studentEmail]) {
    const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
    expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: PASSWORD } })).ok()).toBeTruthy();
  }
  return { lecturerEmail, lecturerName, studentEmail };
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
/** the next Tuesday at least two days ahead, as YYYY-MM-DD (Bangkok calendar) */
const nextTuesday = () => {
  const today = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())}T00:00:00Z`);
  for (let i = 2; i < 10; i += 1) {
    const d = new Date(today.getTime() + i * 86400000);
    if (DAYS[d.getUTCDay()] === "tuesday") return d.toISOString().slice(0, 10);
  }
  throw new Error("unreachable");
};

test("a lecturer sets office hours, a student books a free slot, the lecturer confirms it", async ({ page, request, browser }) => {
  const p = await people(request);

  // lecturer: one Tuesday slot
  await login(page, p.lecturerEmail);
  await page.goto("/appointments");
  const editor = page.getByTestId("office-hours-editor");
  await expect(editor.getByText("ยังไม่มี office hours")).toBeVisible({ timeout: 15_000 });
  await editor.getByRole("button", { name: "เพิ่มช่วงเวลา" }).click();
  const row = editor.getByTestId("office-hour-row").first();
  await row.getByLabel("วัน").click();
  await page.getByRole("option", { name: "อังคาร" }).click();
  await row.getByLabel("เริ่ม").fill("13:00");
  await row.getByLabel("สิ้นสุด").fill("13:30");
  await row.getByLabel("สถานที่").fill("CAMT 301");
  await editor.getByRole("button", { name: "บันทึก office hours" }).click();
  await expect(page.getByText(/บันทึก office hours แล้ว/)).toBeVisible();

  // student: menu → lecturer → Tuesday → the slot → book
  const student = await browser.newPage();
  await login(student, p.studentEmail);
  await student.locator("a[href='/appointments']").first().click();
  await expect(student).toHaveURL(/\/appointments/);
  const card = student.getByTestId("bookable-lecturer").filter({ hasText: p.lecturerName });
  await expect(card).toContainText("อังคาร 13:00-13:30");
  await card.getByRole("button").click();
  const dialog = student.getByRole("dialog");
  await dialog.getByLabel("วันที่").fill(nextTuesday());
  await dialog.getByRole("button", { name: /13:00-13:30 · CAMT 301/ }).click();
  await dialog.getByLabel("เรื่องที่ต้องการปรึกษา").fill("ปรึกษาหัวข้อโปรเจกต์");
  await dialog.getByRole("button", { name: /จอง|Book/ }).last().click();
  await expect(dialog).toBeHidden();

  // the same slot now shows as taken
  await card.getByRole("button").click();
  await student.getByRole("dialog").getByLabel("วันที่").fill(nextTuesday());
  await expect(student.getByRole("dialog").getByRole("button", { name: /13:00-13:30.*มีคนจองแล้ว/ })).toBeDisabled();
  await student.close();

  // lecturer confirms
  await page.reload();
  await page.getByRole("tab", { name: /รอยืนยัน|Pending/ }).click();
  const pending = page.locator("div").filter({ hasText: "ปรึกษาหัวข้อโปรเจกต์" }).filter({ has: page.getByRole("button", { name: /ยืนยัน|Confirm/ }) }).last();
  await pending.getByRole("button", { name: /ยืนยัน|Confirm/ }).click();
  await page.getByRole("tab", { name: /กำลังจะมาถึง|Upcoming/ }).click();
  await expect(page.getByText("ปรึกษาหัวข้อโปรเจกต์")).toBeVisible();
});

test("admin sees appointments but has no booking button (only students book)", async ({ page }) => {
  await login(page, "admin@showpro.local");
  await page.goto("/appointments");
  await expect(page.getByRole("tab").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("bookable-lecturer")).toHaveCount(0);
});
