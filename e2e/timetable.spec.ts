import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
// drags need both the class and the drop slot on screen; with force:true Playwright does not scroll the target in
test.use({ viewport: { width: 1280, height: 1400 } });

async function token(request: APIRequestContext, email: string) {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;
}

/** courses cannot be deleted once they have sections; park them in a term nobody uses */
async function park(request: APIRequestContext, staff: Record<string, string>, ...ids: string[]) {
  for (const id of ids) await request.patch(`${API}/courses/${id}`, { headers: staff, data: { academicYear: "2500" } });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/** two courses in chompoo's term (A: section 01 Monday, section 02 Thursday 09:30; B: Saturday) */
async function setup(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers;
  const stamp = Date.now().toString(36).toUpperCase();
  const make = async (code: string, sections: unknown[]) => {
    const res = await request.post(`${API}/courses`, { headers: staff, data: {
      code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: lecturers[0].id, status: "active", sections,
    } });
    expect(res.ok()).toBeTruthy();
    return (await res.json()).course as { id: string; code: string; sections: Array<{ id: string; number: string }> };
  };
  const a = await make(`TTA${stamp}`, [
    { number: "01", maxStudents: 5, schedule: [{ day: "monday", startTime: "08:00", endTime: "09:00" }] },
    { number: "02", maxStudents: 5, schedule: [{ day: "thursday", startTime: "09:30", endTime: "11:00" }] },
  ]);
  const b = await make(`TTB${stamp}`, [{ number: "01", maxStudents: 5, schedule: [{ day: "saturday", startTime: "10:00", endTime: "11:00" }] }]);
  return { staff, a, b };
}

test("student timetable shows the enrolled section at :30, weekends, and only this term", async ({ page, request }) => {
  const { staff, a, b } = await setup(request);
  await login(page, "chompoo@student.showpro.local");
  const studentToken = await page.evaluate(() => localStorage.getItem("showpro_auth_token"));
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  for (const [course, sectionId] of [[a, a.sections.find((s) => s.number === "02")!.id], [b, b.sections[0].id]] as const) {
    const res = await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: course.id, sectionId } });
    expect(res.ok()).toBeTruthy();
  }
  try {
    await page.goto("/schedule");
    const slotA = page.locator(`[data-testid=timetable-slot][data-course="${a.code}"]`).first();
    await expect(slotA).toHaveAttribute("data-day", "thursday");
    await expect(slotA).toHaveAttribute("data-start", "09:30");
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${a.code}"][data-day=monday]`)).toHaveCount(0); // section 01's time
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${b.code}"]`).first()).toHaveAttribute("data-day", "saturday");
    await expect(page.getByRole("button", { name: /แก้ไขตาราง|Edit schedule|ขอย้าย/ })).toHaveCount(0);
  } finally {
    for (const course of [a, b]) await request.delete(`${API}/enrollments/course/${course.id}`, { headers: student });
    await park(request, staff, a.id, b.id);
  }
});

test("lecturer timetable has a term picker that defaults to the newest term", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.goto("/schedule");
  await expect(page.getByTestId("term-picker")).toContainText("1/2569");
  await expect(page.locator("[data-testid=timetable-slot][data-course=DII340]").first()).toHaveAttribute("data-start", "09:00");
});

test("staff move keeps minutes, keeps the student's section, and offers no fake one-time move", async ({ page, request }) => {
  const { staff, a, b } = await setup(request);
  const sec02 = a.sections.find((s) => s.number === "02")!;
  const studentToken = await token(request, "chompoo@student.showpro.local");
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: a.id, sectionId: sec02.id } })).ok()).toBeTruthy();
  try {
    await login(page, "staff@showpro.local");
    await page.goto("/schedule-management");
    await expect(page.getByTestId("term-picker")).toContainText("1/2569");
    await page.locator("#edit-mode").click(); // the "แก้ไขตาราง" switch
    const slot = page.locator(`[data-testid=timetable-slot][data-course="${a.code}"][data-day=thursday]`);
    // earlier runs leave moved classes at Thursday 13:00; while dragging they stop taking pointer events,
    // but Playwright's pre-drag actionability check would wait on them, so skip that check
    await slot.dragTo(page.getByTestId("drop-thursday-13:00"), { force: true });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(/ทุกสัปดาห์|every week/);
    await expect(dialog.getByText(/เฉพาะ|one-time/i)).toHaveCount(0);
    await dialog.getByRole("button", { name: /ยืนยัน|Confirm/ }).click();

    await expect.poll(async () => {
      const course = (await (await request.get(`${API}/courses/${a.id}`, { headers: staff })).json()).course;
      return course.sections.find((s: { number: string }) => s.number === "02").schedule[0];
    }).toMatchObject({ day: "thursday", startTime: "13:00", endTime: "14:30" });
    const mine = (await (await request.get(`${API}/enrollments`, { headers: student })).json()).enrollments.find((e: { courseId: string }) => e.courseId === a.id);
    expect(mine.sectionId).toBe(sec02.id);
  } finally {
    await request.delete(`${API}/enrollments/course/${a.id}`, { headers: student });
    await park(request, staff, a.id, b.id);
  }
});

test("the schedule page's request panel lists class move requests, not keyword-matched general requests", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/schedule-management");
  const panel = page.getByTestId("schedule-requests");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/คำขอย้ายคาบ|Class move requests/);
  await expect(panel.getByRole("button", { name: /เปิดหน้าคำร้อง|Open requests/ })).toHaveCount(0);
});

test("staff can shift a class into time its own block covers", async ({ page, request }) => {
  const staffToken = await token(request, "staff@showpro.local");
  const staff = { Authorization: `Bearer ${staffToken}` };
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers;
  const code = `TTS${Date.now().toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: lecturers[0].id, status: "active",
    sections: [{ number: "01", maxStudents: 5, schedule: [{ day: "sunday", startTime: "09:00", endTime: "12:00" }] }],
  } });
  const course = (await created.json()).course as { id: string };
  try {
    await login(page, "staff@showpro.local");
    await page.goto("/schedule-management");
    await page.locator("#edit-mode").click();
    const slot = page.locator(`[data-testid=timetable-slot][data-course="${code}"]`);
    await slot.dragTo(page.getByTestId("drop-sunday-10:00"), { force: true });
    await page.getByRole("dialog").getByRole("button", { name: /ยืนยัน|Confirm/ }).click();
    await expect.poll(async () => (await (await request.get(`${API}/courses/${course.id}`, { headers: staff })).json()).course.sections[0].schedule[0])
      .toMatchObject({ day: "sunday", startTime: "10:00", endTime: "13:00" });
  } finally {
    await park(request, staff, course.id);
  }
});
