import { expect, test, type Page } from "@playwright/test";

const thaiToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function pickDII340(page: Page) {
  await page.locator("main").getByRole("combobox").first().click();
  await page.getByRole("option", { name: /DII340/ }).click();
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
}

test("attendance defaults to the Thai day, cannot go ahead, and shows unmarked students as unmarked", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.waitForURL("**/dashboard");
  await page.goto("/attendance");
  await pickDII340(page);
  const dateInput = page.locator("main input[type=date]");
  await expect(dateInput).toHaveValue(thaiToday());
  await expect(dateInput).toHaveAttribute("max", thaiToday());

  await dateInput.fill("2026-02-02"); // no seed attendance on this day
  await expect(page.getByTestId("unmarked-count")).not.toHaveText("0");
  await expect(page.getByTestId("absent-count")).toHaveText("0");
});

test("a failed save is reported and the row goes back", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.waitForURL("**/dashboard");
  await page.goto("/attendance");
  await pickDII340(page);
  await page.locator("main input[type=date]").fill("2026-02-02");
  const firstRow = page.getByTestId("attendance-row").first();
  await expect(firstRow).toHaveAttribute("data-status", "unmarked");
  await page.route("**/api/attendance/check-in", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, message: "boom" }) }));
  await firstRow.getByTestId("mark-late").click();
  await expect(page.getByText(/บันทึกการเช็คชื่อไม่สำเร็จ|Could not save attendance/)).toBeVisible();
  await expect(firstRow).toHaveAttribute("data-status", "unmarked");
});

test("a QR link opened before login keeps its token through the login page", async ({ page }) => {
  await page.goto("/student/checkin?token=not-a-real-token");
  await page.waitForURL("**/login");
  await login(page, "alice@student.showpro.local");
  await page.waitForURL("**/student/checkin?token=not-a-real-token");
  await expect(page.getByText(/Invalid or inactive session/)).toBeVisible();
});

test("a late failure never undoes a newer choice", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.waitForURL("**/dashboard");
  await page.goto("/attendance");
  await pickDII340(page);
  // the rows reload for the new date; a click made before that reload lands is overwritten by it
  const reloaded = Promise.all(["/api/attendance/report", "/api/enrollments"].map((path) =>
    page.waitForResponse((response) => response.url().includes(path)).then((response) => response.finished())));
  await page.locator("main input[type=date]").fill("2026-02-02");
  await reloaded;
  const firstRow = page.getByTestId("attendance-row").first();
  await expect(firstRow).toHaveAttribute("data-status", "unmarked");
  let calls = 0;
  await page.route("**/api/attendance/check-in", async (route) => {
    calls += 1;
    if (calls === 1) {
      await new Promise((r) => setTimeout(r, 800)); // the first save fails after the second one succeeded
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, message: "boom" }) });
    } else {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, attendance: {} }) });
    }
  });
  await firstRow.getByTestId("mark-present").click();
  await firstRow.getByTestId("mark-late").click();
  await expect(page.getByText(/บันทึกการเช็คชื่อไม่สำเร็จ|Could not save attendance/)).toBeVisible();
  await expect(firstRow).toHaveAttribute("data-status", "late");
});

test("the status counters add up to the class", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.waitForURL("**/dashboard");
  await page.goto("/attendance");
  await pickDII340(page);
  await page.locator("main input[type=date]").fill("2026-02-02");
  const rows = await page.getByTestId("attendance-row").count();
  expect(rows).toBeGreaterThan(0);
  let sum = 0;
  for (const id of ["present-count", "late-count", "absent-count", "leave-count", "unmarked-count"]) {
    sum += Number(await page.getByTestId(id).textContent());
  }
  expect(sum).toBe(rows);
});
