import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

const DEMO_REPORTS = /ทำความเข้าใจ codebase|สร้าง REST API 3 endpoints|เขียน Unit Tests|Understanding the codebase|Built 3 REST API endpoints/;

test("an intern with no logs or evaluation never borrows the demo interns' reports or scores", async ({ page }) => {
  // the audit case: a real record that has no logs and no evaluation yet
  await page.route("**/api/internships", (route) =>
    route.fulfill({
      json: {
        success: true,
        internships: [{
          id: "rec1", status: "in_progress", duration: 12, position: "QA Intern", companyName: "Real Co",
          student: { id: "s1", studentId: "65019999", user: { id: "u1", name: "Real Student", nameThai: "นักศึกษาจริง" } },
          company: { id: "c1", companyName: "Real Co", user: { id: "cu1", name: "Real Co" } },
          logs: [], documents: [], evaluation: null,
        }],
      },
    }),
  );
  await login(page, "talent@northernsoft.local");
  await page.goto("/intern-tracking");
  await expect(page.getByText("นักศึกษาจริง").first()).toBeVisible();
  const main = page.locator("main");
  // demo intern #1 has 8 completed weeks and a 4.5 rating; this record has no logs and no evaluation
  await expect(main.getByText(/สัปดาห์ 8\/12|Week 8\/12/)).toHaveCount(0);
  await expect(main.getByText(/4\.5/)).toHaveCount(0);
  await expect(main.getByText(DEMO_REPORTS)).toHaveCount(0);
});

test("cooperation shows no hard-coded MOU dates or coordinator", async ({ page }) => {
  await login(page, "staff@showpro.local");
  await page.goto("/cooperation");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/1 มกราคม 2567|31 ธันวาคม 2569|053-942-xxx|1 ปี 9 เดือน/)).toHaveCount(0);
});

test("an evaluated intern shows the real 0–5 scores, not rounded up or as percent", async ({ page }) => {
  await page.route("**/api/internships", (route) =>
    route.fulfill({
      json: {
        success: true,
        internships: [{
          id: "rec2", status: "in_progress", duration: 12, position: "Dev Intern", companyName: "Real Co",
          student: { id: "s2", studentId: "65019998", user: { id: "u2", name: "Evaluated Student", nameThai: "นักศึกษามีผลประเมิน" } },
          company: { id: "c1", companyName: "Real Co", user: { id: "cu1", name: "Real Co" } },
          logs: [{ id: "l1", activities: "Built the login page", hours: 6 }], documents: [],
          evaluation: { overallScore: 4.58, technicalSkills: 4.6, softSkills: 4.2, workEthic: 4.8, problemSolving: 4.4 },
        }],
      },
    }),
  );
  await login(page, "talent@northernsoft.local");
  await page.goto("/intern-tracking");
  const main = page.locator("main");
  await expect(main.getByText("4.6/5.0").first()).toBeVisible();
  await expect(main.getByText("5.0/5.0")).toHaveCount(0);
  await page.getByText("นักศึกษามีผลประเมิน").first().click();
  await expect(main.getByText(/^5%$/)).toHaveCount(0);
  await expect(main.getByText("4.6/5").first()).toBeVisible();
});
