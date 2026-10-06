import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

const pages: Record<string, string[]> = {
  "alice@student.showpro.local": ["/dashboard", "/courses", "/schedule", "/grades", "/activities", "/requests", "/internships", "/appointments"],
  "narin@showpro.local": ["/dashboard", "/courses", "/grades", "/attendance", "/advisees", "/appointments", "/schedule"],
  "staff@showpro.local": ["/dashboard", "/courses", "/requests", "/students", "/users", "/activities-management", "/intern-tracking"],
  "talent@northernsoft.local": ["/dashboard", "/talent-search", "/student-profiles"],
};

// API errors that already existed before this plan (baseline recorded in the plan ledger)
const BASELINE: RegExp[] = [];

for (const [email, routes] of Object.entries(pages)) {
  test(`${email} pages load without API errors or crashes`, async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`crash ${String(e).slice(0, 120)}`));
    page.on("response", (r) => {
      if (!r.url().includes("/api/") || r.status() < 400) return;
      const line = `${r.status()} ${r.request().method()} ${r.url().replace(/^.*\/api/, "/api")}`;
      if (!BASELINE.some((re) => re.test(line))) problems.push(line);
    });
    await login(page, email);
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
    }
    expect(problems).toEqual([]);
  });
}

test("the owning lecturer still sees the class list of DII340", async ({ page }) => {
  await login(page, "narin@showpro.local");
  await page.goto("/attendance");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Bob|บ๊อบ|65010002/).first()).toBeVisible();
});
