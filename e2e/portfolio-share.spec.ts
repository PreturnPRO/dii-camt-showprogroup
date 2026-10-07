import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const CHOMPOO = "chompoo@student.showpro.local";
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

test("public mode opens the share link to anyone, private closes it", async ({ page, request, browser }) => {
  const student = { Authorization: `Bearer ${await token(request, CHOMPOO)}` };
  const profile = async () => (await (await request.get(`${API}/students/profile`, { headers: student })).json()).profile;
  const me = await profile();
  const original = me.portfolio as Record<string, unknown> | null;
  const keep = {
    githubUrl: original?.githubUrl ?? "", linkedinUrl: original?.linkedinUrl ?? "", personalWebsite: original?.personalWebsite ?? "",
    sharedWith: original?.sharedWith ?? [], projects: original?.projects ?? [], summaryThai: original?.summaryThai ?? "",
  };
  const summary = `E2E share summary ${Date.now()}`;
  const setSharing = (isPublic: boolean, allow: boolean, text: unknown) => request.patch(`${API}/students/profile`, { headers: student, data: {
    portfolio: { ...keep, summary: text, isPublic }, consent: { allowPortfolioSharing: allow },
  } });
  // public in the portfolio row but no consent: the link does not work, so the switch must say private
  expect((await setSharing(true, false, summary)).ok()).toBeTruthy();
  const outsider = await browser.newContext();
  const outsiderPage = await outsider.newPage();
  try {
    await login(page, CHOMPOO);
    await page.goto("/portfolio");
    const toggle = page.locator("#portfolio-public-mode");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.getByTestId("share-portfolio")).toBeDisabled();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("public-note")).toBeVisible();
    await expect(page.getByTestId("share-portfolio")).toBeEnabled();
    await expect.poll(async () => {
      const p = await profile();
      return [p.portfolio?.isPublic, p.consent?.allowPortfolioSharing];
    }).toEqual([true, true]);

    await outsiderPage.goto(`/portfolio/${me.studentId}`);
    await expect(outsiderPage.getByText(me.user?.name ?? me.name).first()).toBeVisible();
    await expect(outsiderPage.getByText(summary)).toBeVisible();
    await expect(outsiderPage.getByText(/set to private/)).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect.poll(async () => (await profile()).consent?.allowPortfolioSharing).toBe(false);
    await outsiderPage.reload();
    await expect(outsiderPage.getByText(/set to private/)).toBeVisible();
  } finally {
    await outsider.close();
    // put back what was there (a missing row comes back as an empty one, which is private without consent)
    await setSharing(original ? original.isPublic === true : true, me.consent?.allowPortfolioSharing === true, original?.summary ?? "");
  }
});
