import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const STUDENT = "alice@student.showpro.local";
// the /notifications page is staff/admin only; students see notifications in the header bell
const STAFF = "staff@showpro.local";

async function tokenFor(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } });
  return (await res.json()).token as string;
}

// one fresh unread notification per test, so read state from earlier runs never matters
async function freshUnread(request: APIRequestContext, recipient: string) {
  const recipientToken = await tokenFor(request, recipient);
  const me = await request.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${recipientToken}` } });
  const meBody = await me.json();
  const userId = meBody.data?.user?.id ?? meBody.user?.id;
  const staff = await tokenFor(request, "staff@showpro.local");
  const title = `E2E unread ${Date.now()}`;
  const sent = await request.post(`${API}/notifications/broadcast`, {
    headers: { Authorization: `Bearer ${staff}` },
    data: { title, titleThai: title, message: "e2e", messageThai: "e2e", userIds: [userId] },
  });
  expect(sent.ok()).toBeTruthy();
  return title;
}

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

const markReadError = /ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จ|Could not mark as read/;

test("notifications page: a failed mark-read keeps the item unread and says so", async ({ page, request }) => {
  const title = await freshUnread(request, STAFF);
  await page.route("**/api/notifications/**", fail("PATCH", /\/notifications\/[^/]+\/read$/));
  await login(page, STAFF);
  await page.goto("/notifications");
  const row = page.getByRole("button", { name: new RegExp(title) }).first();
  await expect(row.getByTestId("unread-dot")).toBeVisible({ timeout: 15_000 });

  await row.click();
  await expect(page.getByText(markReadError)).toBeVisible();
  await expect(row.getByTestId("unread-dot")).toBeVisible();
});

test("notifications page: a failed mark-all-read changes nothing, in the page or the header", async ({ page, request }) => {
  const title = await freshUnread(request, STAFF);
  await page.route("**/api/notifications/**", fail("PATCH", /\/notifications\/read-all$/));
  await login(page, STAFF);
  await page.goto("/notifications");
  const row = page.getByRole("button", { name: new RegExp(title) }).first();
  await expect(row.getByTestId("unread-dot")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("unread-indicator")).toBeVisible();

  await page.getByRole("button", { name: /^(อ่านทั้งหมด|Mark All Read)$/ }).click();
  await expect(page.getByText(markReadError)).toBeVisible();
  await expect(row.getByTestId("unread-dot")).toBeVisible();
  await expect(page.getByTestId("unread-indicator")).toBeVisible();
});

test("header bell: a failed mark-read keeps the item unread and says so", async ({ page, request }) => {
  const title = await freshUnread(request, STUDENT);
  await page.route("**/api/notifications/**", fail("PATCH", /\/notifications\/[^/]+\/read$/));
  await login(page, STUDENT);
  await page.getByTestId("unread-indicator").click();
  const item = page.getByRole("menu").getByRole("button", { name: new RegExp(title) });
  await expect(item).toHaveAttribute("data-unread", "true", { timeout: 15_000 });

  await item.click();
  await expect(page.getByText(markReadError)).toBeVisible();
  await expect(item).toHaveAttribute("data-unread", "true");
  await expect(page.getByTestId("unread-indicator")).toBeVisible();
});

test("notifications page: a failed load is an error, not an empty inbox", async ({ page }) => {
  await login(page, STAFF);
  await page.route(/\/api\/notifications$/, fail("GET", /\/api\/notifications$/));
  await page.goto("/notifications");
  await expect(page.getByTestId("notifications-load-error")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /ลองใหม่|Retry/ })).toBeVisible();
});

test("header bell: a successful mark-read still marks the item read", async ({ page, request }) => {
  const title = await freshUnread(request, STUDENT);
  await login(page, STUDENT);
  await page.getByTestId("unread-indicator").click();
  const item = page.getByRole("menu").getByRole("button", { name: new RegExp(title) });
  await expect(item).toHaveAttribute("data-unread", "true", { timeout: 15_000 });
  await item.click();
  await expect(item).toHaveAttribute("data-unread", "false");
  await expect(page.getByText(markReadError)).toHaveCount(0);
});

test("header bell: a failed load says so instead of showing an empty inbox", async ({ page }) => {
  await page.route(/\/api\/notifications$/, fail("GET", /\/api\/notifications$/));
  await login(page, STUDENT);
  await page.getByTestId("notification-bell").click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByTestId("header-notifications-load-error")).toBeVisible();
  await expect(menu.getByText(/ยังไม่มีแจ้งเตือน|No notifications yet/)).toHaveCount(0);
});
