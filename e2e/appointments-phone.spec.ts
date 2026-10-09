import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const PASSWORD = "Password123!";
const PHONE = { width: 390, height: 844 };

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
  return { studentEmail, lecturerName };
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

// G5 (S-M3): on a phone a student's own bookings sat under every lecturer card (32,000 px down),
// a pending card showed only the day number, and nothing marked or found the advisor
test("a student on a phone sees their bookings first, with time and place, and finds their advisor at the top", async ({ page, request }) => {
  const s = await setup(request);
  await page.setViewportSize(PHONE);
  await login(page, s.studentEmail);
  await page.goto("/appointments");
  const firstLecturer = page.getByTestId("bookable-lecturer").first();
  await expect(firstLecturer).toBeVisible({ timeout: 15_000 });

  const pendingTab = page.getByRole("tab", { name: /รอยืนยัน|Pending/ });
  const tabY = (await pendingTab.boundingBox())!.y;
  const lecturerY = (await firstLecturer.boundingBox())!.y;
  expect(tabY).toBeLessThan(lecturerY);

  await pendingTab.click();
  const card = page.getByTestId("appointment-card").filter({ hasText: s.lecturerName });
  await expect(card).toContainText("10:00-11:00");
  await expect(card).toContainText("ห้อง DII 4");

  // the advisor comes first and is marked
  await expect(firstLecturer).toContainText(s.lecturerName);
  await expect(firstLecturer).toContainText("อาจารย์ที่ปรึกษา");

  // a search narrows the directory
  await page.getByRole("searchbox", { name: /ค้นหาอาจารย์|Search lecturers/ }).fill(s.lecturerName);
  await expect(page.getByTestId("bookable-lecturer")).toHaveCount(1);
});

// G5 (S-M2): on a phone, tapping a job only highlighted the card; the details sat 1,700 px below
test("a student on a phone who taps a job is taken to its details", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await login(page, "alice@student.showpro.local");
  await page.goto("/internships");
  const cards = page.getByTestId("job-card");
  await expect(cards.nth(1)).toBeVisible({ timeout: 15_000 });
  const title = (await cards.nth(1).getByRole("heading").first().innerText()).trim();
  await cards.nth(1).click();
  await expect(page.getByTestId("job-detail").getByRole("heading", { name: title })).toBeInViewport();
});

// review M1: the bookmark inside a job card works from the keyboard and does not select the job instead
test("the bookmark on a job card is named and works from the keyboard", async ({ page }) => {
  await login(page, "alice@student.showpro.local");
  await page.goto("/internships");
  const card = page.getByTestId("job-card").nth(1);
  await expect(card).toBeVisible({ timeout: 15_000 });
  const bookmark = card.getByRole("button", { name: /บันทึกงาน|Save job/ });
  const before = await bookmark.getAttribute("aria-pressed");
  await bookmark.focus();
  await page.keyboard.press("Enter");
  await expect(bookmark).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Enter"); // put it back
});
