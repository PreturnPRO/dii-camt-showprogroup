import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
test.use({ viewport: { width: 1280, height: 1400 } });

async function token(request: APIRequestContext, email: string) {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } })).json()).token as string;
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}
const futureMonday = () => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 8));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const plus = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

test("moving a class whose course has no room in the system says to pick a room", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const seeded = (await (await request.get(`${API}/courses?q=DII340`, { headers: staff })).json()).courses.find((x: { code: string }) => x.code === "DII340");
  const code = `RH${Date.now().toString(36).toUpperCase()}`;
  const res = await request.post(`${API}/courses`, { headers: staff, data: {
    code, name: code, nameThai: code, credits: 1, semester: 1, academicYear: "2569", year: 4, lecturerId: seeded.lecturerId, status: "active",
    sections: [{ number: "01", maxStudents: 5, schedule: [{ day: "saturday", startTime: "08:00", endTime: "09:00" }] }],
  } });
  expect(res.ok()).toBeTruthy();
  const course = (await res.json()).course as { id: string };
  const monday = futureMonday();
  try {
    await login(page, "narin@showpro.local");
    await page.goto(`/schedule?week=${monday}`);
    await page.locator(`[data-testid=timetable-slot][data-course="${code}"][data-kind=regular]`).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("move-date").fill(plus(monday, 6));
    await dialog.getByTestId("move-start").selectOption("10:00");
    await dialog.getByTestId("move-reason").fill("conference");
    await expect(dialog.getByText("วิชานี้ยังไม่มีห้องในระบบ เลือกห้องใหม่ก่อนส่ง")).toBeVisible();
    await expect(dialog.getByTestId("move-submit")).toBeDisabled();
  } finally {
    await request.patch(`${API}/courses/${course.id}`, { headers: staff, data: { academicYear: "2500", status: "archived" } });
  }
});
