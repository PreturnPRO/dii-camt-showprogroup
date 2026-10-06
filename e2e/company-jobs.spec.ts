import { expect, test } from "@playwright/test";

test("a company with no internship quota can still publish an internship", async ({ page, request }) => {
  // the seed company has no contact person, which opens the onboarding dialog over every page
  const login = await request.post("http://localhost:4000/api/auth/login", { data: { email: "talent@northernsoft.local", password: "Password123!" } });
  const token = (await login.json()).token;
  await request.patch("http://localhost:4000/api/users/profile", {
    headers: { Authorization: `Bearer ${token}` },
    data: { roleData: { contactPersonName: "Somsri HR", contactPersonPhone: "0812345678", contactPersonEmail: "hr@northernsoft.example.com" } },
  });
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", "talent@northernsoft.local");
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/job-postings");
  await page.getByRole("button", { name: /ประกาศงานใหม่|new posting/i }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /ฝึกงาน|internship/i }).click();
  await expect(sheet.getByText(/โควตา|quota/i)).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: /เผยแพร่|publish/i })).toBeEnabled();
});
