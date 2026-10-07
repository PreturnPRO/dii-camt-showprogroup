import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
test.use({ viewport: { width: 1280, height: 1400 } });
const token = async (request: APIRequestContext, email: string) =>
  (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/** next Monday (Thai) at least 8 days ahead, as YYYY-MM-DD */
const futureMonday = () => {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 8));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const plus = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

/** a fresh course with one section in a fresh room; the lecturer is taken from a seeded course they teach */
async function classFor(request: APIRequestContext, staff: Record<string, string>, opts: { teaches?: string; slot?: { day: string; startTime: string; endTime: string } } = {}) {
  const teaches = opts.teaches ?? "DII340"; // narin; DII420 is mali's
  const seeded = (await (await request.get(`${API}/courses?q=${teaches}`, { headers: staff })).json()).courses.find((x: { code: string }) => x.code === teaches);
  const code = `MV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
  // a fresh room each run: course creation checks rooms across every term, and earlier runs' parked courses still hold theirs
  const room = await request.post(`${API}/facilities`, { headers: staff, data: { code: `R${code}`, name: `Room ${code}`, building: "E2E", room: code, type: "classroom", capacity: 10, isActive: true } });
  expect(room.ok()).toBeTruthy();
  const facility = (await room.json()).facility as { id: string };
  const res = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: seeded.lecturerId, status: "active",
    sections: [{ number: "01", maxStudents: 5, facilityId: facility.id, schedule: [opts.slot ?? { day: "saturday", startTime: "08:00", endTime: "09:00" }] }],
  } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).course as { id: string; code: string; sections: Array<{ id: string }> };
}
const cancelMovesOf = async (request: APIRequestContext, staff: Record<string, string>, code: string, monday: string) => {
  const moves = (await (await request.get(`${API}/class-moves?from=${monday}&to=${plus(monday, 6)}`, { headers: staff })).json()).moves;
  for (const m of moves.filter((x: { courseCode: string; status: string }) => x.courseCode === code && x.status === "approved")) {
    await request.post(`${API}/class-moves/${m.id}/cancel`, { headers: staff });
  }
};
const park = (request: APIRequestContext, staff: Record<string, string>, id: string) =>
  request.patch(`${API}/courses/${id}`, { headers: staff, data: { academicYear: "2500" } });

test("a student sees a staff move in the week it happens", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const c = await classFor(request, staff);
  const monday = futureMonday();
  const saturday = plus(monday, 5);
  const studentToken = await token(request, "chompoo@student.showpro.local");
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: c.id, sectionId: c.sections[0].id } })).ok()).toBeTruthy();
  const moved = await request.post(`${API}/class-moves`, { headers: staff, data: { sectionId: c.sections[0].id, originalDate: saturday, originalStart: "08:00", newDate: plus(monday, 6), newStart: "10:00", reason: "e2e" } });
  expect(moved.status()).toBe(201);
  const moveId = (await moved.json()).move.id;
  try {
    await login(page, "chompoo@student.showpro.local");
    await page.goto(`/schedule?week=${monday}`);
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=moved-out]`)).toHaveAttribute("data-date", saturday);
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=moved-in]`)).toHaveAttribute("data-start", "10:00");
    await page.getByTestId("week-next").click();
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=regular]`)).toHaveCount(1);
  } finally {
    await request.post(`${API}/class-moves/${moveId}/cancel`, { headers: staff });
    await request.delete(`${API}/enrollments/course/${c.id}`, { headers: student });
    await park(request, staff, c.id);
  }
});

test("a lecturer asks, staff see the clash check and approve, the lecturer's week changes", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const c = await classFor(request, staff);
  const monday = futureMonday();
  try {
    await login(page, "narin@showpro.local");
    await page.goto(`/schedule?week=${monday}`);
    await page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=regular]`).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("move-date").fill(plus(monday, 6));
    await dialog.getByTestId("move-start").selectOption("10:00");
    await dialog.getByTestId("move-reason").fill("conference");
    await expect(dialog.getByTestId("move-clash-block")).toHaveCount(0);
    await dialog.getByTestId("move-submit").click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"]`).first()).toContainText(/รออนุมัติ|Pending/);

    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); // sign out
    await login(page, "staff@showpro.local");
    await page.goto("/schedule-management");
    const row = page.getByTestId("move-request").filter({ hasText: c.code });
    await expect(row).toContainText("10:00");
    await row.getByRole("button", { name: /อนุมัติ|Approve/ }).click();
    await expect(row).toHaveCount(0);

    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await login(page, "narin@showpro.local");
    await page.goto(`/schedule?week=${monday}`);
    await expect(page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=moved-in]`)).toHaveAttribute("data-start", "10:00");
  } finally {
    await cancelMovesOf(request, staff, c.code, monday);
    await park(request, staff, c.id);
  }
});

test("the form blocks a busy room and only warns about students", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  // mali's class, so a red line can only be the room (DII340 in room 401 is narin's, Mondays 09:00–12:00)
  const c = await classFor(request, staff, { teaches: "DII420" });
  // a student who also takes narin's Sunday 10:00 class
  const other = await classFor(request, staff, { slot: { day: "sunday", startTime: "10:00", endTime: "11:00" } });
  const studentToken = await token(request, "chompoo@student.showpro.local");
  const student = { Authorization: `Bearer ${studentToken}` };
  const me = (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  for (const course of [c, other]) {
    expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId: me.id, courseId: course.id, sectionId: course.sections[0].id } })).ok()).toBeTruthy();
  }
  const monday = futureMonday();
  try {
    await login(page, "staff@showpro.local");
    await page.goto(`/schedule-management?week=${monday}`);
    await page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=regular]`).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("move-date").fill(monday);
    await dialog.getByTestId("move-start").selectOption("09:00");
    const facilities = (await (await request.get(`${API}/facilities`, { headers: staff })).json()).facilities as Array<{ id: string; room?: string; code: string }>;
    const dii401 = facilities.find((f) => `${f.code} ${f.room ?? ""}`.includes("401"))!;
    await dialog.getByTestId("move-room").selectOption(dii401.id);
    await dialog.getByTestId("move-reason").fill("test");
    await expect(dialog.getByTestId("move-clash-block")).toHaveCount(1);
    await expect(dialog.getByTestId("move-clash-block")).toContainText(/ห้องไม่ว่าง|Room busy/);
    await expect(dialog.getByTestId("move-submit")).toBeDisabled();

    // its own room on Sunday 10:00: free, but the student has the other class then
    await dialog.getByTestId("move-room").selectOption("");
    await dialog.getByTestId("move-date").fill(plus(monday, 6));
    await dialog.getByTestId("move-start").selectOption("10:00");
    await expect(dialog.getByTestId("move-clash-warn")).toContainText(other.code);
    await expect(dialog.getByTestId("move-clash-block")).toHaveCount(0);
    await expect(dialog.getByTestId("move-submit")).toBeEnabled();
  } finally {
    for (const course of [c, other]) await request.delete(`${API}/enrollments/course/${course.id}`, { headers: student });
    await park(request, staff, c.id);
    await park(request, staff, other.id);
  }
});

test("staff move a moved class again by dragging it", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const c = await classFor(request, staff);
  const monday = futureMonday();
  const first = await request.post(`${API}/class-moves`, { headers: staff, data: { sectionId: c.sections[0].id, originalDate: plus(monday, 5), originalStart: "08:00", newDate: plus(monday, 6), newStart: "10:00", reason: "e2e" } });
  expect(first.status()).toBe(201);
  try {
    await login(page, "staff@showpro.local");
    await page.goto(`/schedule-management?week=${monday}`);
    await page.locator("#edit-mode").click();
    const movedIn = page.locator(`[data-testid=timetable-slot][data-course="${c.code}"][data-kind=moved-in]`);
    await expect(movedIn).toBeVisible();
    await movedIn.dragTo(page.getByTestId("drop-sunday-13:00"), { force: true });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(/ย้ายมาจาก|moved from/);
    await dialog.getByTestId("move-reason").fill("again");
    await expect(dialog.getByTestId("move-submit")).toBeEnabled();
    await expect(dialog.getByTestId("move-clash-block")).toHaveCount(0);
    await dialog.getByTestId("move-submit").click();
    await expect(dialog).toBeHidden();
    await expect.poll(async () => {
      const moves = (await (await request.get(`${API}/class-moves?from=${monday}&to=${plus(monday, 6)}`, { headers: staff })).json()).moves;
      return moves.filter((m: { courseCode: string }) => m.courseCode === c.code).map((m: { newStart: string; status: string }) => `${m.newStart} ${m.status}`).sort();
    }).toEqual(["10:00 cancelled", "13:00 approved"]);
  } finally {
    await cancelMovesOf(request, staff, c.code, monday);
    await park(request, staff, c.id);
  }
});

test("a weekly change over a class with a one-time move lists the moves to cancel", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const c = await classFor(request, staff);
  const monday = futureMonday();
  const moved = await request.post(`${API}/class-moves`, { headers: staff, data: { sectionId: c.sections[0].id, originalDate: plus(monday, 5), originalStart: "08:00", newDate: plus(monday, 6), newStart: "10:00", reason: "e2e" } });
  expect(moved.status()).toBe(201);
  try {
    await login(page, "staff@showpro.local");
    await page.goto("/schedule-management");
    await page.locator("#edit-mode").click();
    const slot = page.locator(`[data-testid=timetable-slot][data-course="${c.code}"]`);
    await expect(slot).toBeVisible();
    await slot.dragTo(page.getByTestId("drop-friday-13:00"), { force: true });
    await page.getByRole("dialog").getByRole("button", { name: /ยืนยัน|Confirm/ }).click();
    const list = page.getByTestId("blocking-moves");
    await expect(list).toContainText(plus(monday, 5));
    await list.getByRole("button", { name: /ยกเลิกการย้าย|Cancel move/ }).click();
    await expect(list).toHaveCount(0);
    await expect.poll(async () => (await (await request.get(`${API}/class-moves?from=${monday}&to=${plus(monday, 6)}`, { headers: staff })).json()).moves
      .find((m: { courseCode: string }) => m.courseCode === c.code)?.status).toBe("cancelled");
  } finally {
    await cancelMovesOf(request, staff, c.code, monday);
    await park(request, staff, c.id);
  }
});
