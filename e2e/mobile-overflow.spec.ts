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

/**
 * text or controls in <main> cut off by a box that hides overflow, with nothing in between that
 * scrolls — on a phone that content simply cannot be reached
 */
const clipped = (page: Page) =>
  page.locator("main").evaluate((main) => {
    const out: string[] = [];
    const scrolls = (s: CSSStyleDeclaration) => s.overflowX === "auto" || s.overflowX === "scroll";
    const hides = (s: CSSStyleDeclaration) => s.overflowX === "hidden" || s.overflowX === "clip";
    for (const el of Array.from(main.querySelectorAll<HTMLElement>("button, a, input, th, td, span, p, h1, h2, h3, h4, [role=tab]"))) {
      const label = (el.innerText || el.getAttribute("aria-label") || (el as HTMLInputElement).placeholder || "").trim();
      if (!label) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.closest(".sr-only, [aria-hidden=true]")) continue;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (scrolls(s)) break;
        if (hides(s) || p === main) {
          const box = p.getBoundingClientRect();
          // a truncated label (ellipsis) is shown on purpose; only count content pushed out of the box
          if (r.right > box.right + 2 || r.left < box.left - 2) out.push(`${label.slice(0, 30)} (${Math.round(Math.max(r.right - box.right, box.left - r.left))}px)`);
          break;
        }
      }
    }
    return [...new Set(out)];
  });

// G5 (UX-M8): at 390 px these pages cut off columns and buttons with no way to scroll to them
const pages: Array<{ email: string; path: string; ready: string }> = [
  { email: "talent@northernsoft.local", path: "/applicants", ready: "main h1" },
  { email: "talent@northernsoft.local", path: "/job-postings", ready: "main h1" },
  { email: "staff@showpro.local", path: "/users", ready: "main h1" },
  { email: "narin@showpro.local", path: "/appointments", ready: "main h1" },
  { email: "admin@showpro.local", path: "/attendance", ready: "main h1" },
  { email: "alice@student.showpro.local", path: "/grades", ready: "main h1" },
];

for (const p of pages) {
  test(`${p.email} ${p.path} at 390 px cuts nothing off`, async ({ page }) => {
    await page.setViewportSize(PHONE);
    await login(page, p.email);
    await page.goto(p.path);
    await expect(page.locator(p.ready).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    expect(await clipped(page)).toEqual([]);
  });
}
