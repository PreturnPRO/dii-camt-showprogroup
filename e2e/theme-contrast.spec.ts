import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

/**
 * text in <main> whose colour, against the background it actually sits on (semi-transparent layers
 * composited), is below `min`:1 — 3 catches text that is close to invisible (the audit measured 1.0–1.3)
 */
const unreadable = (page: Page, min = 3) =>
  page.locator("main").evaluate((main, min) => {
    type RGBA = [number, number, number, number];
    // any CSS colour (rgb, oklch, …) through a 1×1 canvas
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    const parse = (c: string): RGBA | null => {
      if (!c || c === "transparent") return [0, 0, 0, 0];
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top: RGBA, under: RGBA): RGBA => {
      const a = top[3] + under[3] * (1 - top[3]);
      if (a === 0) return [0, 0, 0, 0];
      const ch = (i: number) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a;
      return [ch(0), ch(1), ch(2), a];
    };
    const background = (el: Element | null): RGBA => {
      const layers: RGBA[] = [];
      for (let node = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        // a gradient or image is not a flat colour; skip text on it rather than guess
        if (style.backgroundImage !== "none") return [0, 0, 0, -1];
        const c = parse(style.backgroundColor);
        if (c && c[3] > 0) layers.push(c);
        if (c && c[3] >= 1) break;
      }
      let result: RGBA = [255, 255, 255, 1];
      for (const layer of layers.reverse()) result = over(layer, result);
      return result;
    };
    const lum = ([r, g, b]: RGBA) => {
      const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bad: string[] = [];
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const el = node.parentElement;
      if (!text || !el) continue;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      if (el.closest(".sr-only")) continue;
      const bg = background(el);
      if (bg[3] < 0) continue;
      const fg = parse(style.color);
      if (!fg) continue;
      const color = over(fg, bg);
      const [hi, lo] = [lum(color), lum(bg)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      if (ratio < min) bad.push(`${text.slice(0, 30)} (${ratio.toFixed(2)})`);
    }
    return [...new Set(bad)];
  }, min);

// G5 (UX-M1, UX-M2): surfaces written for one theme left text invisible in the other
/** a requirement card to look at (the seed company has none); returns how to remove it */
const withRequirement = async (request: APIRequestContext) => {
  const token = (await (await request.post(`${API}/auth/login`, { data: { email: "talent@northernsoft.local", password: "Password123!" } })).json()).token;
  const headers = { Authorization: `Bearer ${token}` };
  const res = await request.post(`${API}/jobs`, {
    headers,
    data: {
      title: `Contrast ${Date.now()}`, type: "skill_requirement", positions: 1, description: "contrast check", responsibilities: [],
      requirements: ["React"], preferredSkills: ["React"], salary: "", benefits: [], location: "Chiang Mai", workType: "hybrid",
      deadline: new Date(Date.now() + 864e5 * 30).toISOString(), status: "open",
    },
  });
  expect(res.ok()).toBe(true);
  const id = (await res.json()).job?.id ?? (await res.json()).id;
  return () => request.delete(`${API}/jobs/${id}`, { headers });
};

const cases: Array<{ email: string; path: string; scheme: "light" | "dark"; ready: string; seed?: (r: APIRequestContext) => Promise<() => unknown> }> = [
  { email: "staff@showpro.local", path: "/dashboard", scheme: "light", ready: "main h1" },
  { email: "staff@showpro.local", path: "/budget", scheme: "light", ready: "main h1" },
  { email: "admin@showpro.local", path: "/courses", scheme: "dark", ready: "main h1" },
  { email: "alice@student.showpro.local", path: "/courses", scheme: "dark", ready: "main h1" },
  { email: "talent@northernsoft.local", path: "/skills-requirement", scheme: "dark", ready: "main h3", seed: withRequirement },
  { email: "alice@student.showpro.local", path: "/portfolio", scheme: "dark", ready: "main h1" },
  { email: "alice@student.showpro.local", path: "/personal-dashboard", scheme: "dark", ready: "main h1" },
];

for (const c of cases) {
  test(`${c.email} ${c.path} in ${c.scheme} mode has no near-invisible text`, async ({ page, request }) => {
    const cleanup = c.seed ? await c.seed(request) : null;
    await page.emulateMedia({ colorScheme: c.scheme });
    await login(page, c.email);
    await page.goto(c.path);
    await expect(page.locator(c.ready).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800); // entry animations fade text in
    const bad = await unreadable(page);
    await cleanup?.();
    expect(bad).toEqual([]);
  });
}
