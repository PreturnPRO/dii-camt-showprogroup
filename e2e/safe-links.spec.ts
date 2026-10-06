import { expect, test } from "@playwright/test";

test("a stored javascript: link on a public portfolio is never opened", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(url));
      return null;
    }) as typeof window.open;
  });
  // simulate links that were stored before the backend started refusing them
  await page.route("**/api/students/profile/**", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        profile: {
          id: "p1", studentId: "65010001", name: "Alice", nameThai: "อลิซ", major: "DII", year: 3,
          cvUrl: "javascript:alert(4)",
          portfolio: { id: "pf1", studentId: "p1", isPublic: true, summary: "x", githubUrl: "javascript:alert(1)", linkedinUrl: "javascript:alert(2)", personalWebsite: "javascript:alert(3)", projects: [{ title: "P", description: "d", role: "r", technologies: [], startDate: "2026-01-01", url: "javascript:alert(5)" }] },
          skills: [], badges: [],
        },
      },
    });
  });
  await page.goto("/portfolio/65010001");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("อลิซ").first()).toBeVisible();
  const buttons = page.locator("button:has(svg.lucide-github), button:has(svg.lucide-linkedin), button:has(svg.lucide-globe), button:has(svg.lucide-file-text), button:has-text(\"View Project\")");
  expect(await buttons.count()).toBeGreaterThan(0);
  for (let i = 0; i < (await buttons.count()); i++) await buttons.nth(i).click();
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened.filter((u) => /^\s*javascript:/i.test(u))).toEqual([]);
});

test("a student cannot change the semester in Settings", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "alice@student.showpro.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/settings");
  await expect(page.getByTestId("semester-select")).toBeDisabled();
});
