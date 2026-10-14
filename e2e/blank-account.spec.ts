import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API } from "./env";

// test audit T-M4: every seed student has an advisor and seed sections, so screens were never shown a
// student with nothing on record — the case where an invented fallback (an advisor, a time, a room) shows up.

const PASSWORD = "Password123!";

const token = async (request: APIRequestContext, email: string, password = PASSWORD) => {
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).token as string;
};

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", PASSWORD);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("a new student with no advisor sees 'none yet' and their own Wednesday 09:30 class, nothing invented", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const email = `e2e-blank-${stamp}@example.com`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `66${String(stamp).slice(-7)}`, name: `Blank E2E ${stamp}`, nameThai: `บัญชีว่าง ${stamp}`, email,
    major: "DII", program: "DII", year: 3, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
  expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: PASSWORD } })).ok()).toBeTruthy();
  const student = { Authorization: `Bearer ${await token(request, email)}` };

  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers as Array<{ id: string }>;
  const code = `E2EBL${stamp.toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: `Blank ${code}`, nameThai: `วิชาบัญชีว่าง ${code}`, credits: 1, semester: 1, academicYear: "2569", year: 3,
    lecturerId: lecturers[lecturers.length - 1].id, status: "active",
    sections: [{ number: "01", maxStudents: 5, schedule: [{ day: "wednesday", startTime: "09:30", endTime: "10:30" }] }],
  } });
  expect(created.ok()).toBeTruthy();
  const course = (await created.json()).course as { id: string; sections: Array<{ id: string }> };
  try {
    expect((await request.post(`${API}/enrollments`, { headers: student, data: { courseId: course.id, sectionId: course.sections[0].id } })).ok()).toBeTruthy();

    await login(page, email);
    await page.goto("/personal-dashboard");
    await expect(page.locator("main").getByText(/ที่ปรึกษา:\s*ยังไม่มี/)).toBeVisible({ timeout: 15_000 });

    await page.goto("/courses");
    await page.getByRole("tab", { name: /รายวิชาของฉัน|My Courses/ }).click();
    const main = page.locator("main");
    await expect(main.getByText(code).first()).toBeVisible({ timeout: 15_000 });
    const schedule = main.getByTestId("course-card-schedule").first();
    await expect(schedule).toContainText("พุธ");
    await expect(schedule).toContainText("09:30");
    await expect(main).not.toContainText(/จันทร์ 09:00 - 12:00|ห้อง 301|ชำระเงินแล้ว|ยืนยันเรียบร้อย|นรินทร์/);
  } finally {
    await request.patch(`${API}/courses/${course.id}`, { headers: staff, data: { academicYear: "2500", status: "archived" } });
  }
});
