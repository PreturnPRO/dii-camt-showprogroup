import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

async function statsOf(page: Page, request: import("@playwright/test").APIRequestContext) {
  const token = await page.evaluate(() => sessionStorage.getItem("showpro_auth_token") ?? localStorage.getItem("showpro_auth_token"));
  return (await (await request.get(`${API}/students/stats`, { headers: { Authorization: `Bearer ${token}` } })).json()).stats;
}

test("grades page shows the real term GPA (or '-') next to GPAX", async ({ page, request }) => {
  await login(page, "alice@student.showpro.local");
  const stats = await statsOf(page, request);
  await page.goto("/grades");
  const main = page.locator("main");
  const expected = stats.currentTermGpa === null ? "-" : Number(stats.currentTermGpa).toFixed(2);
  await expect(main.getByTestId("term-gpa")).toHaveText(expected);
  await expect(main.getByTestId("gpax")).toHaveText(Number(stats.gpax).toFixed(2));
});

test("dashboards never invent an 'I' grade and plot one point per graded term", async ({ page, request }) => {
  await login(page, "alice@student.showpro.local");
  const stats = await statsOf(page, request);
  expect(stats.termGpa.length).toBeGreaterThan(0);
  await page.goto("/personal-dashboard");
  await expect(page.getByTestId("gpa-history").first()).toHaveAttribute("data-points", String(stats.termGpa.length));
  await expect(page.locator("main").getByText(/^I$/)).toHaveCount(0);
  await page.goto("/dashboard");
  await page.getByRole("tab", { name: "ผลการเรียน" }).click();
  await expect(page.getByTestId("gpa-history").first()).toHaveAttribute("data-points", String(stats.termGpa.length));
  await expect(page.locator("main").getByText(/^I$/)).toHaveCount(0);
});

test("the dashboards' latest GPA is the current term GPA (or '-'), the same number the grades page shows", async ({ page, request }) => {
  await login(page, "alice@student.showpro.local");
  const stats = await statsOf(page, request);
  const expected = stats.currentTermGpa === null ? "-" : Number(stats.currentTermGpa).toFixed(2);
  await page.goto("/personal-dashboard");
  await expect(page.getByTestId("gpa-latest").first()).toHaveText(expected);
  await page.goto("/dashboard");
  await page.getByRole("tab", { name: "ผลการเรียน" }).click();
  await expect(page.getByTestId("gpa-latest").first()).toHaveText(expected);
});
