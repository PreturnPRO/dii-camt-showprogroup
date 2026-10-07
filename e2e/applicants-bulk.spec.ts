import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
const COMPANY = "talent@northernsoft.local";

async function tokenFor(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: "Password123!" } });
  return (await res.json()).token as string;
}

// a fresh posting each run, with alice and bob applying, so earlier runs' status changes never leak in
async function freshApplicants(request: APIRequestContext) {
  const company = await tokenFor(request, COMPANY);
  const auth = { Authorization: `Bearer ${company}` };
  // the seed company has no contact person, which opens the onboarding dialog over every page
  await request.patch(`${API}/users/profile`, {
    headers: auth,
    data: { roleData: { contactPersonName: "Somsri HR", contactPersonPhone: "0812345678", contactPersonEmail: "hr@northernsoft.example.com" } },
  });
  const title = `E2E bulk ${Date.now()}`;
  const job = await request.post(`${API}/jobs`, {
    headers: auth,
    data: { title, type: "internship", description: "e2e", location: "CM", workType: "onsite", status: "open" },
  });
  expect(job.ok()).toBeTruthy();
  const jobId = (await job.json()).data?.job?.id ?? (await job.json()).job?.id;
  const ids: string[] = [];
  for (const email of ["alice@student.showpro.local", "bob@student.showpro.local"]) {
    const student = await tokenFor(request, email);
    const applied = await request.post(`${API}/applications`, { headers: { Authorization: `Bearer ${student}` }, data: { jobPostingId: jobId } });
    expect(applied.ok()).toBeTruthy();
    const body = await applied.json();
    ids.push(body.data?.application?.id ?? body.application?.id);
  }
  return { title, ids };
}

async function openApplicants(page: Page, title: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", COMPANY);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/applicants");
  const rows = page.locator("tbody tr", { hasText: title });
  await expect(rows).toHaveCount(2, { timeout: 15_000 });
  return rows;
}

const failPatchFor = (ids: string[]) => async (route: import("@playwright/test").Route) => {
  const id = route.request().url().split("/").pop();
  if (route.request().method() === "PATCH" && ids.includes(id!)) {
    await route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"fail"}' });
  } else {
    await route.continue();
  }
};

test("bulk shortlist with one failure changes only the one that saved and says so", async ({ page, request }) => {
  const { title, ids } = await freshApplicants(request);
  await page.route("**/api/applications/*", failPatchFor([ids[1]]));
  const rows = await openApplicants(page, title);
  const first = rows.nth(0);
  const second = rows.nth(1);
  const statusBefore = await second.locator("td").last().innerText();

  await first.getByRole("checkbox").check();
  await second.getByRole("checkbox").check();
  await page.getByRole("button", { name: /^(คัดเลือก|Shortlist)$/ }).click();

  await expect(page.getByText(/สำเร็จ 1 จาก 2 รายการ|Updated 1 of 2/)).toBeVisible();
  // list order is not guaranteed, so find the failed row by its still-ticked checkbox
  const firstIsFailed = (await first.getByRole("checkbox").getAttribute("data-state")) === "checked";
  const failedRow = firstIsFailed ? first : second;
  const savedRow = firstIsFailed ? second : first;
  await expect(failedRow.getByRole("checkbox")).toHaveAttribute("data-state", "checked");
  await expect(savedRow.getByRole("checkbox")).toHaveAttribute("data-state", "unchecked");
  await expect(failedRow.locator("td").last()).toHaveText(statusBefore);
  await expect(savedRow.locator("td").last()).toHaveText(/คัดเลือก|Shortlist/i);
});

test("bulk reject that fails for everyone shows an error and changes nothing", async ({ page, request }) => {
  const { title, ids } = await freshApplicants(request);
  await page.route("**/api/applications/*", failPatchFor(ids));
  const rows = await openApplicants(page, title);
  const before = [await rows.nth(0).locator("td").last().innerText(), await rows.nth(1).locator("td").last().innerText()];

  await rows.nth(0).getByRole("checkbox").check();
  await rows.nth(1).getByRole("checkbox").check();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /^(ปฏิเสธ|Reject)$/ }).click();

  await expect(page.getByText(/ปรับสถานะไม่สำเร็จ|Could not update status/)).toBeVisible();
  await expect(page.getByText(/^(ปรับสถานะแล้ว|Status updated)/)).toHaveCount(0);
  await expect(rows.nth(0).locator("td").last()).toHaveText(before[0]);
  await expect(rows.nth(1).locator("td").last()).toHaveText(before[1]);
});

test("bulk shortlist sends one request per applicant even when clicked twice", async ({ page, request }) => {
  const { title, ids } = await freshApplicants(request);
  let patches = 0;
  await page.route("**/api/applications/*", async (route) => {
    if (route.request().method() === "PATCH" && ids.includes(route.request().url().split("/").pop()!)) {
      patches += 1;
      await new Promise((r) => setTimeout(r, 800));
    }
    await route.continue();
  });
  const rows = await openApplicants(page, title);
  await rows.nth(0).getByRole("checkbox").check();
  await rows.nth(1).getByRole("checkbox").check();
  const shortlist = page.getByRole("button", { name: /^(คัดเลือก|Shortlist)$/ });
  await shortlist.click();
  await shortlist.click({ force: true, timeout: 2_000 }).catch(() => undefined);
  const done = page.getByText(/ปรับสถานะแล้ว 2 รายการ|Updated 2 applications/);
  await expect(done.first()).toBeVisible();
  expect(patches).toBe(2);
  expect(await done.count()).toBe(1);
});
