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

async function freshStudent(request: APIRequestContext, staff: Record<string, string>, tag: string) {
  const stamp = `${Date.now()}${tag}`;
  const email = `e2e-act-${stamp}@example.com`;
  const nameThai = `นักศึกษา กิจกรรม ${stamp}`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `64${stamp.slice(-7)}`, name: `Activity ${stamp}`, nameThai, email, major: "DII", program: "DII", year: 2, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
  expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: PASSWORD } })).ok()).toBeTruthy();
  return { nameThai, auth: { Authorization: `Bearer ${await token(request, email)}` } };
}

const hoursOf = async (request: APIRequestContext, auth: Record<string, string>) =>
  Number((await (await request.get(`${API}/students/profile`, { headers: auth })).json()).profile.totalActivityHours);

test("staff tick who came; that student gets the hours, the one marked absent does not", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const title = `E2E เช็คชื่อกิจกรรม ${Date.now()}`;
  const created = await request.post(`${API}/activities`, { headers: staff, data: {
    title, titleThai: title, description: "e2e attendance", type: "workshop", startDate: new Date(Date.now() - 3600_000).toISOString(),
    endDate: new Date(Date.now() + 3600_000).toISOString(), location: "CAMT", organizer: "DII", activityHours: 3, gamificationPoints: 10, status: "ongoing",
  } });
  expect(created.ok()).toBeTruthy();
  const activityId = (await created.json()).activity.id as string;
  const came = await freshStudent(request, staff, "a");
  const absent = await freshStudent(request, staff, "b");
  for (const s of [came, absent]) expect((await request.post(`${API}/activities/enroll/${activityId}`, { headers: s.auth })).ok()).toBeTruthy();
  const before = { came: await hoursOf(request, came.auth), absent: await hoursOf(request, absent.auth) };

  await login(page, "staff@showpro.local");
  await page.goto("/activities-management");
  const card = page.locator("div").filter({ hasText: title }).filter({ has: page.getByRole("button", { name: /ดูรายละเอียด|View/ }) }).last();
  await card.getByRole("button", { name: /ดูรายละเอียด|View/ }).click();
  const dialog = page.getByRole("dialog");
  const cameRow = dialog.locator("div").filter({ hasText: came.nameThai }).filter({ has: page.getByTestId("attendance-row") }).last();
  const absentRow = dialog.locator("div").filter({ hasText: absent.nameThai }).filter({ has: page.getByTestId("attendance-row") }).last();
  await cameRow.getByRole("button", { name: "เข้าร่วม" }).click();
  await expect(cameRow.getByText("เข้าร่วมแล้ว")).toBeVisible();
  await expect(cameRow.getByRole("button", { name: "ไม่มา" })).toHaveCount(0);
  await absentRow.getByRole("button", { name: "ไม่มา" }).click();
  await expect(absentRow.getByText("ไม่มา", { exact: true }).first()).toBeVisible();

  expect(await hoursOf(request, came.auth)).toBe(before.came + 3);
  expect(await hoursOf(request, absent.auth)).toBe(before.absent);

  // a credit given by mistake is taken back after confirming
  page.once("dialog", (dialog) => dialog.accept());
  await cameRow.getByRole("button", { name: "ถอนการเข้าร่วม" }).click();
  await expect(cameRow.getByText("ไม่มา", { exact: true }).first()).toBeVisible();
  expect(await hoursOf(request, came.auth)).toBe(before.came);
});
