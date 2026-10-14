import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API } from "./env";


async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

async function narinData(request: APIRequestContext) {
  const login = await request.post(`${API}/auth/login`, { data: { email: "narin@showpro.local", password: "Password123!" } });
  const auth = { Authorization: `Bearer ${(await login.json()).token}` };
  const schedule = (await (await request.get(`${API}/courses/lecturer/schedule`, { headers: auth })).json()).schedule as Array<{
    id: string; code: string; semester: number; academicYear: string; status: string; enrollments: Array<{ status: string; letterGrade: string | null }>;
  }>;
  return { auth, schedule };
}

// test audit T-L5: the ruling pinned with a fixture, instead of the spec working the rule out again.
// In 2570 narin has a pending course and an empty open course in term 2, and a course with a student in
// term 1, so the term being taught is 1/2570 (Por's ruling: newest non-pending course that has a student).
test("the lecturer dashboard shows the term being taught, with real student and awaiting-grade counts", async ({ page, request }) => {
  const staffLogin = await request.post(`${API}/auth/login`, { data: { email: "staff@showpro.local", password: "Password123!" } });
  const staff = { Authorization: `Bearer ${(await staffLogin.json()).token}` };
  // a student of its own: enrolling a seed student would put a course with no times on their screens in later specs
  const studentStamp = Date.now();
  const studentEmail = `e2e-dash-${studentStamp}@example.com`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `68${String(studentStamp).slice(-7)}`, name: "Dashboard Student", nameThai: "นักศึกษา แดชบอร์ด", email: studentEmail,
    major: "DII", program: "DII", year: 4, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  const studentAuth = async (password: string) => ({ Authorization: `Bearer ${(await (await request.post(`${API}/auth/login`, { data: { email: studentEmail, password } })).json()).token}` });
  expect((await request.patch(`${API}/users/profile`, { headers: await studentAuth("Temp-Pass-123!"), data: { currentPassword: "Temp-Pass-123!", newPassword: "Password123!" } })).ok()).toBeTruthy();
  const studentId = (await (await request.get(`${API}/students/profile`, { headers: await studentAuth("Password123!") })).json()).profile.id as string;
  const lecturers = (await (await request.get(`${API}/lecturers`, { headers: staff })).json()).lecturers as Array<{ id: string; user: { email: string } }>;
  const narinId = lecturers.find((l) => l.user.email === "narin@showpro.local")!.id;
  const stamp = Date.now().toString(36).toUpperCase();
  const make = async (code: string, semester: number, status: string) => {
    const res = await request.post(`${API}/courses`, { headers: staff, data: {
      code, name: code, nameThai: code, credits: 1, semester, academicYear: "2570", year: 4, lecturerId: narinId, status,
      sections: [{ number: "01", maxStudents: 5, schedule: [] }],
    } });
    expect(res.ok(), await res.text()).toBeTruthy();
    return (await res.json()).course as { id: string; code: string; sections: Array<{ id: string }> };
  };
  const pending = await make(`E2EPN${stamp}`, 2, "pending");
  const empty = await make(`E2EEM${stamp}`, 2, "active");
  const taught = await make(`E2ETT${stamp}`, 1, "active");
  try {
    expect((await request.post(`${API}/enrollments`, { headers: staff, data: { studentId, courseId: taught.id, sectionId: taught.sections[0].id } })).ok()).toBeTruthy();

    await login(page, "narin@showpro.local");
    const cards = page.getByTestId("lecturer-course");
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    await expect(cards).toHaveCount(1);
    const card = cards.filter({ hasText: taught.code });
    await expect(card).toHaveCount(1);
    for (const other of [pending, empty]) await expect(cards.filter({ hasText: other.code })).toHaveCount(0);
    await expect(card.getByTestId("course-enrolled")).toHaveText(/:\s*1$/);
    await expect(card.getByTestId("course-awaiting")).toHaveText(/:\s*1$/);

    await card.getByRole("link", { name: /เช็คชื่อ|Attendance/ }).click();
    await expect(page).toHaveURL(new RegExp(`/attendance\\?courseId=${taught.id}`));
    await expect(page.getByTestId("attendance-course")).toContainText(taught.code);

    await page.goBack();
    await page.getByTestId("lecturer-course").filter({ hasText: taught.code }).getByRole("link", { name: /ให้เกรด|Grades/ }).click();
    await expect(page).toHaveURL(new RegExp(`/grades\\?courseId=${taught.id}`));
    await expect(page.getByTestId("grade-course-filter")).toHaveValue(taught.id);
  } finally {
    // every clean-up step runs even if one fails; the failures are reported after
    const problems: string[] = [];
    // a course in the approval queue leaves it only through a review: send it back, then archive it
    const rejected = await request.post(`${API}/courses/${pending.id}/review`, { headers: staff, data: { decision: "reject", reason: "e2e clean-up" } });
    if (!rejected.ok()) problems.push(`${pending.code} review: ${await rejected.text()}`);
    for (const course of [pending, empty, taught]) {
      const parked = await request.patch(`${API}/courses/${course.id}`, { headers: staff, data: { academicYear: "2500", status: "archived" } });
      if (!parked.ok()) problems.push(`${course.code}: ${await parked.text()}`);
    }
    expect(problems).toEqual([]);
  }
});

test("upcoming appointments never include ones already past", async ({ page, request }) => {
  const { auth } = await narinData(request);
  const appointments = (await (await request.get(`${API}/appointments`, { headers: auth })).json()).appointments as Array<{ date: string; purpose: string; status: string }>;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const past = appointments.filter((a) => a.date.slice(0, 10) < today && a.purpose);
  expect(past.length, "the seed has past appointments (e.g. 6 May) — otherwise this checks nothing").toBeGreaterThan(0);
  await login(page, "narin@showpro.local");
  await expect(page.getByTestId("lecturer-course").first()).toBeVisible({ timeout: 15_000 });
  for (const a of past) await expect(page.getByText(a.purpose, { exact: true })).toHaveCount(0);
});
