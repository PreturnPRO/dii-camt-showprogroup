import { expect, test, type Page } from "@playwright/test";

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

const hrefsIn = (page: Page, selector: string) =>
  page.locator(`${selector} a[href^='/']`).evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href") as string))]);

// G5 (UX-H2): the phone menu used to be a shorter, separate list — no Messages for anyone,
// no Requests for students, no Advisees/Intern Tracking for lecturers, no Talent Search for companies
for (const email of [
  "alice@student.showpro.local",
  "narin@showpro.local",
  "staff@showpro.local",
  "talent@northernsoft.local",
  "admin@showpro.local",
]) {
  test(`${email}: the phone menu reaches every page the desktop sidebar does`, async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page, email);
    await expect(page.locator("aside nav a").first()).toBeVisible();
    const desktop = await hrefsIn(page, "aside");
    expect(desktop.length).toBeGreaterThan(5);

    await page.setViewportSize(PHONE);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /เปิดเมนู|Open menu/ }).click();
    await expect(page.locator("[role=dialog] a").first()).toBeVisible();
    const phone = await hrefsIn(page, "[role=dialog]");
    expect(desktop.filter((href) => !phone.includes(href))).toEqual([]);
  });
}

// G5 (UX-M3): the drawer is a real dialog — focus goes in, Esc closes it, focus comes back
test("the phone menu is a dialog: named, focus inside, Esc closes and returns focus to the menu button", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await login(page, "alice@student.showpro.local");
  const burger = page.getByRole("button", { name: /เปิดเมนู|Open menu/ });
  await burger.click();
  const drawer = page.getByRole("dialog", { name: /เมนู|Menu/ });
  await expect(drawer).toBeVisible();
  expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await expect(drawer.getByRole("button", { name: /ปิดเมนู|Close menu/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(burger).toBeFocused();
});

// G5 (UX-M4): a dialog opened from a plain button used to drop focus to <body> on close
test("closing a dialog puts focus back on the button that opened it", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await login(page, "staff@showpro.local");
  await page.goto("/courses");
  const add = page.getByRole("button", { name: /เพิ่มรายวิชา|Add course/ }).first();
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(add).toBeFocused();
});

// G5 (UX-M5): the collapsed icon rail had 16 unnamed links, no current-page marker and no skip link
test("the collapsed rail names every link, marks the current page, and a skip link comes first", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await login(page, "staff@showpro.local");
  await expect(page.locator("aside nav a").first()).toBeVisible();
  const links = page.locator("aside nav a[href^='/']");
  expect(await links.count()).toBeGreaterThan(5);
  const unnamed = await links.evaluateAll((as) => as.filter((a) => !(a.getAttribute("aria-label") || a.textContent || "").trim()).map((a) => a.getAttribute("href")));
  expect(unnamed).toEqual([]);
  await expect(page.locator("aside a[aria-current=page]")).toHaveAttribute("href", "/dashboard");

  await page.goto("/dashboard");
  await expect(page.locator("aside nav a").first()).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /ข้ามไปเนื้อหา|Skip to content/ });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("MAIN");
});

// review M2: a dialog opened from a dropdown item returns focus to the dropdown's button, not <body>
test("closing a dialog opened from a menu puts focus back on the menu button", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await login(page, "staff@showpro.local");
  await page.goto("/users");
  const add = page.getByRole("button", { name: /เพิ่มผู้ใช้|Add/ }).first();
  await add.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(add).toBeFocused();
});
