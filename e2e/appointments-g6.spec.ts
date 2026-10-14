import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API } from "./env";

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

/** a fresh lecturer with a Tuesday slot, and a fresh student advised by them with one pending booking */
async function setup(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const lecturerEmail = `e2e-advphone-${stamp}@example.com`;
  const lecturerName = `อาจารย์ ที่ปรึกษา ${stamp}`;
  expect((await request.post(`${API}/users`, { headers: staff, data: {
    name: `Advisor ${stamp}`, nameThai: lecturerName, email: lecturerEmail, role: "LECTURER", password: "Temp-Pass-123!",
    profile: { department: "DII", position: "Lecturer" },
  } })).ok()).toBeTruthy();
  const studentEmail = `e2e-apptphone-${stamp}@example.com`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `61${String(stamp).slice(-7)}`, name: `Phone ${stamp}`, nameThai: `นักศึกษา มือถือ ${stamp}`, email: studentEmail, major: "DII", program: "DII",
    year: 2, semester: 1, academicYear: "2569", password: "Temp-Pass-123!", advisorEmail: lecturerEmail,
  }] } })).ok()).toBeTruthy();
  for (const email of [lecturerEmail, studentEmail]) {
    const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
    expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: PASSWORD } })).ok()).toBeTruthy();
  }
  const lecturerAuth = { Authorization: `Bearer ${await token(request, lecturerEmail)}` };
  expect((await request.put(`${API}/office-hours`, { headers: lecturerAuth, data: {
    officeHours: [{ day: "tuesday", startTime: "10:00", endTime: "11:00", location: "ห้อง DII 4", isAvailable: true }],
  } })).ok()).toBeTruthy();
  const studentAuth = { Authorization: `Bearer ${await token(request, studentEmail)}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: studentAuth })).json()).lecturers as Array<{ id: string; user?: { email?: string }; email?: string }>;
  const lecturer = lecturers.find((l) => (l.user?.email ?? l.email) === lecturerEmail);
  expect(lecturer).toBeTruthy();
  const booked = await request.post(`${API}/appointments`, { headers: studentAuth, data: {
    lecturerId: lecturer!.id, date: nextTuesday(), startTime: "10:00", endTime: "11:00", location: "ห้อง DII 4", purpose: "ปรึกษาแผนการเรียน",
  } });
  expect(booked.ok()).toBeTruthy();
  return { studentEmail, lecturerName, lecturerEmail };
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const nextTuesday = () => {
  const today = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())}T00:00:00Z`);
  for (let i = 2; i < 10; i += 1) {
    const d = new Date(today.getTime() + i * 86400000);
    if (DAYS[d.getUTCDay()] === "tuesday") return d.toISOString().slice(0, 10);
  }
  throw new Error("unreachable");
};

// G6 (owner decisions 9/10/69): a student cancels their own booking before it starts; the lecturer
// marks a confirmed meeting as met only once it has started
test("a student cancels their own waiting booking and it moves to history", async ({ page, request }) => {
  const s = await setup(request);
  await login(page, s.studentEmail);
  await page.goto("/appointments");
  await page.getByRole("tab", { name: /รอยืนยัน|Pending/ }).click();
  const card = page.getByTestId("appointment-card").filter({ hasText: s.lecturerName });
  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "ยกเลิกนัด" }).click();
  await expect(page.getByText("ยกเลิกนัดแล้ว")).toBeVisible();
  await page.getByRole("tab", { name: /ประวัติ|History/ }).click();
  await expect(page.getByTestId("appointment-history").filter({ hasText: s.lecturerName })).toContainText("ยกเลิกแล้ว");
});

test("the lecturer cannot mark a confirmed meeting as met before it starts", async ({ page, request }) => {
  const s = await setup(request);
  const lecturer = { Authorization: `Bearer ${await token(request, s.lecturerEmail)}` };
  const mine = (await (await request.get(`${API}/appointments`, { headers: lecturer })).json()).appointments[0];
  expect((await request.patch(`${API}/appointments/${mine.id}/status`, { headers: lecturer, data: { status: "confirmed" } })).ok()).toBeTruthy();
  await login(page, s.lecturerEmail);
  await page.goto("/appointments");
  const card = page.getByTestId("appointment-card").first();
  await expect(card.getByRole("button", { name: "พบแล้ว" })).toBeDisabled();
  await expect(card.getByRole("button", { name: "ยกเลิกนัด" })).toBeEnabled();
});
