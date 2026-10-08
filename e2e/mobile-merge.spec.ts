import { expect, test, type Page } from "@playwright/test";

const PHONE = { width: 390, height: 844 };

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

const fail = (method: string, pattern: RegExp) => async (route: import("@playwright/test").Route) => {
  if (route.request().method() === method && pattern.test(route.request().url())) {
    await route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"fail"}' });
  } else {
    await route.continue();
  }
};

// a phone used to get a separate dashboard with invented numbers (GPA 3.82, 68/130 credits,
// "Dean's list", a fixed advisor) — it must get the same audited dashboard as a desktop
test("a student on a phone gets the real dashboard, not invented numbers", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await login(page, "alice@student.showpro.local");
  await page.getByRole("tab", { name: "ผลการเรียน" }).click();
  await expect(page.getByTestId("gpa-latest").first()).toBeVisible({ timeout: 15_000 });
  const main = page.locator("main");
  await expect(main.getByText(/เกียรตินิยม|Dean's list/)).toHaveCount(0);
  await expect(main.getByText("นรินทร์ พิชยกุล")).toHaveCount(0);
});

test("a company on a phone sees no invented match percentages", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await login(page, "talent@northernsoft.local");
  await expect(page.locator("main")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main").getByText(/\d+% Match/)).toHaveCount(0);
});

// every link in the phone menu must open a page the role may see (not 404, not bounced home)
for (const email of [
  "alice@student.showpro.local",
  "narin@showpro.local",
  "staff@showpro.local",
  "talent@northernsoft.local",
]) {
  test(`${email}: every phone menu link opens a page this role may see`, async ({ page }) => {
    await page.setViewportSize(PHONE);
    await login(page, email);
    await page.getByTitle("Open Menu").click();
    const hrefs = await page.locator("a[href^='/']").evaluateAll((as) =>
      [...new Set(as.map((a) => a.getAttribute("href") as string))],
    );
    expect(hrefs.length).toBeGreaterThan(3);
    const broken: string[] = [];
    for (const href of hrefs) {
      await page.goto(href);
      await page.waitForLoadState("networkidle");
      const path = new URL(page.url()).pathname;
      // NotFound sets the tab title; matching "404" in the page text also hit ids/numbers in real data
      const notFound = (await page.title()).startsWith("404") ? 1 : 0;
      // a link may carry a query (the dashboard's ?courseId=); a role guard redirect changes the path itself
      const expected = new URL(href, page.url()).pathname;
      if (path !== expected || notFound > 0) broken.push(`${href} → ${path}${notFound ? " (404)" : ""}`);
    }
    expect(broken).toEqual([]);
  });
}

test("staff grades overview: a failed load is an error, not '0 courses'", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.route("**/api/courses**", fail("GET", /\/api\/courses(\?|$)/));
  await page.goto("/grades");
  await expect(page.getByText(/โหลดข้อมูลไม่สำเร็จ|Could not load/)).toBeVisible({ timeout: 15_000 });
});

test("staff grades overview: a failed CSV export says so", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.route("**/grades/export**", fail("GET", /\/grades\/export/));
  await page.goto("/grades");
  await page.getByRole("button", { name: "CSV" }).first().click();
  await expect(page.getByText(/ส่งออก CSV ไม่สำเร็จ|CSV export failed/)).toBeVisible();
});

test("opening a page the role may not see says so", async ({ page }) => {
  await login(page, "alice@student.showpro.local");
  await page.goto("/users");
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeVisible();
});
